import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { Link, useNavigate } from "react-router-dom";
import AsyncSelect from "react-select/async";

const PAGE_SIZE = 15;

// วิธีเดินทางขาไป — ค่าเดียวกับ enum TravelMode ใน schema.prisma
const TRAVEL_MODE_OPTIONS = [
  ["boat", "🚢 เรือ"],
  ["helicopter", "🚁 เฮลิคอปเตอร์"],
  ["vehicle", "🚐 รถ"],
  ["other", "อื่นๆ"],
];

const TRAVEL_KNOWN = TRAVEL_MODE_OPTIONS.map(([v]) => v);

// ค่าใน DB → ฟอร์ม: ค่าที่ไม่อยู่ในรายการ = "อื่นๆ" ที่พิมพ์เอง
const splitTravel = (v) =>
  !v
    ? { travelMode: "", travelOther: "" }
    : TRAVEL_KNOWN.includes(v)
      ? { travelMode: v, travelOther: "" }
      : { travelMode: "other", travelOther: v };

// ฟอร์ม → ค่าที่ส่ง backend: "อื่นๆ" ส่งข้อความที่พิมพ์ (ถ้าไม่พิมพ์ส่ง "other")
const joinTravel = (f) =>
  f.travelMode === "other"
    ? f.travelOther.trim() || "other"
    : f.travelMode || null;

// ค่าเริ่มต้น "ตอบกลับภายใน" = วันนี้ + 10 วัน (แก้ได้ในฟอร์ม)
const DEFAULT_RESPONSE_DAYS = 10;
// const defaultResponseDeadline = () => {
//   const d = new Date();
//   d.setDate(d.getDate() + DEFAULT_RESPONSE_DAYS);
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${d.getFullYear()}-${mm}-${dd}`;
// };

function TravelModeField({ form, setForm }) {
  return (
    <div>
      <label className={LABEL}>ขาไป (วิธีเดินทาง)</label>
      <select
        value={form.travelMode}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            travelMode: e.target.value,
            travelOther: e.target.value === "other" ? prev.travelOther : "",
          }))
        }
        className={INPUT}
      >
        <option value="">— ไม่ระบุ —</option>
        {TRAVEL_MODE_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {form.travelMode === "other" && (
        <input
          type="text"
          value={form.travelOther}
          maxLength={50}
          autoFocus
          placeholder="ระบุวิธีเดินทาง เช่น เครื่องบิน / เรือเร็ว"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, travelOther: e.target.value }))
          }
          className={`${INPUT} mt-2`}
        />
      )}
    </div>
  );
}

const DETAIL_FIELDS = [
  ["owner", "เจ้าของงาน"],
  ["year", "Year"],
  ["projectCode", "Project On"],
  ["jobTitle", "Project / Job"],
  ["ccNo", "CC. No."],
  ["engineer", "Project Engineer"],
  ["customerName", "Customer Name"],
  ["wrPoSr", "WR / PO / SR"],
  ["woAfe", "WO / AFE"],
  ["wa", "WA"],
  ["exptEq", "Expt EQ"],
  ["termOfPaymentDays", "Term of Payment"],
  ["company", "Company"],
  ["team", "Team"],
  ["paymentTerms", "Payment Terms"],
  ["totalValue", "Total Value"],
];

const TABLE_HEADERS = [
  ["ON NUMBER", "w-[150px]"],
  ["PROJECT / JOB", ""],
  ["CUSTOMER", ""],
  ["COMPANY", ""],
  ["TEAM", ""],
  ["STATUS", ""],
  ["ACTIONS", "w-[170px]"],
];

// ── Tailwind class ที่ใช้ซ้ำ (แทน inputStyle / labelStyle / btnBase เดิม) ──
const INPUT =
  "w-full box-border rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-400";
const LABEL = "mb-1.5 block text-[13px] font-semibold";
const BTN =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border-none text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed";
const LIFT_WHITE =
  "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_6px_rgba(0,0,0,0.18),0_2px_3px_rgba(0,0,0,0.1)] hover:-translate-y-px";
const LIFT_BLUE =
  "bg-blue-600 text-white shadow-[0_2px_5px_rgba(13,110,253,0.35)] hover:shadow-[0_4px_8px_rgba(13,110,253,0.45)] hover:-translate-y-px";
const MODAL_HEAD =
  "flex shrink-0 items-center justify-between gap-3 bg-[#1e3a5f] px-4 py-4 text-white sm:px-6";
const MODAL_FOOT =
  "flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3.5 sm:px-6";
const BTN_CANCEL =
  "cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2 text-[13px] hover:bg-gray-50";
const CLOSE_X =
  "shrink-0 cursor-pointer border-none bg-transparent text-xl leading-none text-white";
const PAGE_BTN =
  "cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white";

const fmtShort = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

// แสดงวัน-เวลาที่สร้าง เพราะหลาย record ถูกสร้างพร้อมกันเป็นชุด วันที่เดียวกันแยกไม่ออก
const fmtCreatedAt = (d) =>
  new Date(d).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ── กรอบ modal ที่ใช้ร่วมกันทุกตัว: overlay + panel ที่ scroll ได้บนจอเตี้ย ──
function ModalShell({ onClose, zClass = "z-[999999]", maxW, children }) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/50 p-3 sm:p-5`}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full ${maxW} flex-col overflow-hidden rounded-[10px] bg-white`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ linkedCount, large = false }) {
  const size = large ? "text-xs" : "text-[11px]";
  return linkedCount > 0 ? (
    <span
      className={`whitespace-nowrap rounded-md bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800 ${size}`}
    >
      ✓ เปิดใช้งานแล้ว ({linkedCount}
      {large ? " Project" : ""})
    </span>
  ) : (
    <span
      className={`whitespace-nowrap rounded-md bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800 ${size}`}
    >
      ยังไม่เปิดใช้งาน
    </span>
  );
}

// ── grid label-value สำหรับสรุป record ที่เลือก (ใช้ใน Start modal) ──
function RecordSummaryGrid({ record }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-y-1 text-xs">
      <div className="font-semibold text-gray-500">ON Number</div>
      <div className="break-words">{record.projectCode}</div>
      <div className="font-semibold text-gray-500">Project / Job</div>
      <div className="break-words">{record.jobTitle}</div>
      <div className="font-semibold text-gray-500">Customer</div>
      <div className="break-words">{record.customerName || "—"}</div>
      <div className="font-semibold text-gray-500">Company</div>
      <div className="break-words">{record.company || "—"}</div>
    </div>
  );
}

export default function Project() {
  const { backendUrl } = useContext(AppContent);
  const navigate = useNavigate();

  // ── ยกเลิกการเช็ค role ในระดับ component นี้ ──
  // สิทธิ์เข้าถึงหน้า /projects ถูกควบคุมที่ AppRouter.jsx (allowRoles) อยู่แล้ว
  const canManageProjects = true;

  const [years, setYears] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ records: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [clients, setClients] = useState([]);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [linkedProjectsModal, setLinkedProjectsModal] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({
    location: "",
    startDate: "",
    endDate: "",
    isOffshore: false,
    travelMode: "",
    travelOther: "",
    responseDeadline: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Start Project modal ──
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedMasterRecord, setSelectedMasterRecord] = useState(null);
  const [startContractId, setStartContractId] = useState("");
  const [startForm, setStartForm] = useState({
    location: "",
    startDate: "",
    endDate: "",
    isOffshore: false,
    travelMode: "",
    travelOther: "",
    responseDeadline: "",
    notes: "",
  });
  const [starting, setStarting] = useState(false);

  const fetchYears = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/projects/master-records/years`,
        { withCredentials: true },
      );
      setYears(res.data);
      if (res.data.length > 0 && activeYear === null) {
        setActiveYear(res.data[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/clients`, {
        withCredentials: true,
      });
      setClients(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRecords = async (year, pageNum, search) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/projects/master-records/browse`,
        {
          withCredentials: true,
          params: { year, page: pageNum, pageSize: PAGE_SIZE, search },
        },
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeYear !== null) fetchRecords(activeYear, page, searchQuery);
  }, [activeYear, page, searchQuery]);

  const switchYear = (y) => {
    setActiveYear(y);
    setPage(1);
  };

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  // ── auto-match client จาก record.company (best-effort, ยัง override ได้) ──
  const guessContract = (record) => {
    if (!record?.company) return "";
    const q = record.company.toLowerCase();
    for (const c of clients) {
      if (
        c.name.toLowerCase().includes(q) ||
        q.includes(c.name.toLowerCase())
      ) {
        if (c.contracts?.length === 1) return c.contracts[0].id;
      }
    }
    return "";
  };

  // ── โหลด options สำหรับ AsyncSelect ค้นหา ON Number ──
  const loadMasterRecordOptions = async (inputValue) => {
    try {
      const res = await axios.get(`${backendUrl}/api/projects/master-records`, {
        withCredentials: true,
        params: { search: inputValue },
      });
      return res.data.map((r) => ({
        value: r.id,
        label: `${r.projectCode} — ${r.jobTitle}`,
        record: r,
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const openStartModal = (prefillRecord = null) => {
    if (prefillRecord) {
      setSelectedMasterRecord({
        value: prefillRecord.id,
        label: `${prefillRecord.projectCode} — ${prefillRecord.jobTitle}`,
        record: prefillRecord,
      });
      setStartContractId(guessContract(prefillRecord));
    } else {
      setSelectedMasterRecord(null);
      setStartContractId("");
    }
    setStartForm({
      location: "",
      startDate: "",
      endDate: "",
      isOffshore: false,
      travelMode: "",
      travelOther: "",
      // responseDeadline: "",
      // responseDeadline: defaultResponseDeadline(),
      responseDays: String(DEFAULT_RESPONSE_DAYS),
      notes: "",
    });
    setStartModalOpen(true);
  };

  const closeStartModal = () => {
    setStartModalOpen(false);
    setSelectedMasterRecord(null);
    setStartContractId("");
    setStartForm({
      location: "",
      startDate: "",
      endDate: "",
      isOffshore: false,
      travelMode: "",
      travelOther: "",
      // responseDeadline: "",
      responseDays: String(DEFAULT_RESPONSE_DAYS),
      notes: "",
    });
  };

  const handleStartSubmit = async () => {
    if (!selectedMasterRecord) {
      alert("กรุณาเลือก ON Number ก่อน");
      return;
    }
    if (!startContractId) {
      alert("กรุณาเลือก Client/Contract");
      return;
    }
    try {
      setStarting(true);
      const res = await axios.post(
        `${backendUrl}/api/projects`,
        {
          masterProjectRecordId: selectedMasterRecord.value,
          contractId: startContractId,
          location: startForm.location || null,
          startDate: startForm.startDate || null,
          endDate: startForm.endDate || null,
          isOffshore: startForm.isOffshore,
          // travelMode: startForm.travelMode || null,
          travelMode: joinTravel(startForm),
          // responseDeadline: startForm.responseDeadline || null,
          responseDays: Number(startForm.responseDays) || DEFAULT_RESPONSE_DAYS,
          notes: startForm.notes || null,
        },
        { withCredentials: true },
      );
      closeStartModal();
      navigate(`/projects/${res.data.id}`);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "เปิดใช้งาน Project ไม่สำเร็จ");
    } finally {
      setStarting(false);
    }
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setEditForm({
      location: project.location || "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
      isOffshore: project.isOffshore ?? false,
      // travelMode: project.travelMode || "",
      ...splitTravel(project.travelMode),
      // responseDeadline: project.responseDeadline
      //   ? project.responseDeadline.slice(0, 10)
      //   : "",
      responseDays: String(project.responseDays ?? DEFAULT_RESPONSE_DAYS),
      notes: project.notes || "",
    });
  };

  const closeEditModal = () => {
    setEditingProject(null);
    setEditForm({
      location: "",
      startDate: "",
      endDate: "",
      isOffshore: false,
      travelMode: "",
      travelOther: "",
      // responseDeadline: "",
      responseDays: String(DEFAULT_RESPONSE_DAYS),
      notes: "",
    });
  };

  const handleEditSubmit = async () => {
    if (!editingProject) return;
    try {
      setSavingEdit(true);
      await axios.put(
        `${backendUrl}/api/projects/${editingProject.id}`,
        {
          name: editingProject.name,
          contractId: editingProject.contractId,
          location: editForm.location || null,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          isOffshore: editForm.isOffshore,
          // travelMode: editForm.travelMode || null,
          travelMode: joinTravel(editForm),
          // responseDeadline: editForm.responseDeadline || null,
          responseDays: Number(editForm.responseDays) || DEFAULT_RESPONSE_DAYS,
          notes: editForm.notes || null,
        },
        { withCredentials: true },
      );
      closeEditModal();
      // รีเฟรชทั้งตาราง master record และ linked list ที่เปิดอยู่ (ถ้ามี)
      fetchRecords(activeYear, page, searchQuery);
      if (linkedProjectsModal) {
        const res = await axios.get(
          `${backendUrl}/api/projects/master-records/browse`,
          {
            withCredentials: true,
            params: {
              year: activeYear,
              page,
              pageSize: PAGE_SIZE,
              search: searchQuery,
            },
          },
        );
        const refreshed = res.data.records.find(
          (r) => r.id === linkedProjectsModal.id,
        );
        if (refreshed) setLinkedProjectsModal(refreshed);
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "แก้ไข Project ไม่สำเร็จ");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (
      !window.confirm(
        `ลบ Project "${project.name}" ทิ้งถาวร?\n\n⚠ การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด (position request, shortlist, booking, assignment, mobilization checklist) ไปด้วย กู้คืนไม่ได้`,
      )
    )
      return;
    try {
      setDeletingId(project.id);
      await axios.delete(`${backendUrl}/api/projects/${project.id}`, {
        withCredentials: true,
      });
      fetchRecords(activeYear, page, searchQuery);
      if (linkedProjectsModal) {
        setLinkedProjectsModal((prev) => ({
          ...prev,
          linkedProjects: prev.linkedProjects.filter(
            (p) => p.id !== project.id,
          ),
        }));
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "ลบ Project ไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDetailValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (key === "termOfPaymentDays") return `${value} วัน`;
    if (key === "totalValue") return Number(value).toLocaleString("th-TH");
    return value;
  };

  const getPageNumbers = (current, total) => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let last;
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }
    range.forEach((i) => {
      if (last) {
        if (i - last === 2) rangeWithDots.push(last + 1);
        else if (i - last > 2) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      last = i;
    });
    return rangeWithDots;
  };

  // ── ปุ่ม View / รายการ — ใช้ร่วมกันทั้งตาราง (จอใหญ่) และการ์ด (มือถือ) ──
  const renderRecordActions = (r, linkedCount) => (
    <>
      <button
        title="ดูรายละเอียดทั้งหมด"
        onClick={() => setViewingRecord(r)}
        className={`${BTN} ${LIFT_WHITE} min-w-[72px] px-3.5 py-1.5 text-gray-700`}
      >
        👁 View
      </button>
      {linkedCount > 0 && (
        <button
          onClick={() => setLinkedProjectsModal(r)}
          className={`${BTN} ${LIFT_BLUE} min-w-[72px] px-3.5 py-1.5`}
        >
          📂 รายการ ({linkedCount})
        </button>
      )}
    </>
  );

  const emptyState = (text) => (
    <div className="rounded-[10px] border border-gray-200 bg-white p-10 text-center text-[13px] text-gray-500">
      {text}
    </div>
  );

  const startDisabled = !selectedMasterRecord || !startContractId || starting;

  return (
    // lg ขึ้นไป: สูงเต็มจอ ตาราง scroll ภายในการ์ด
    // ต่ำกว่า lg: สูงตามเนื้อหา ทั้งหน้า scroll ปกติ
    <div className="flex flex-col lg:h-[calc(100vh-90px)]">
      <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col">
        {/* Header Card */}
        <div className="mb-4 rounded-[10px] border border-gray-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-xl">🗂</span>
              <span className="text-lg font-bold">Projects</span>
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                Phase 3
              </span>
              <span className="basis-full text-xs text-gray-500 md:basis-auto">
                Master Project Register — เลือก ON Number เพื่อเปิด/ดู Project
              </span>
            </div>

            {canManageProjects && (
              <button
                onClick={() => openStartModal(null)}
                className={`${BTN} w-full rounded-md bg-[#198754] px-[18px] py-2.5 text-[13px] text-white hover:bg-[#157347] sm:w-auto`}
              >
                🚀 Start New Project
              </button>
            )}
          </div>
        </div>

        {/* ════════ Search & Filter ════════ */}
        <div className="mb-4 shrink-0 rounded-[10px] border border-gray-200 bg-white px-4 py-3.5">
          <div className="mb-3 text-[13px] font-bold text-gray-900">
            🔍 Search &amp; Filter
          </div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">
            ค้นหา (ON Number / ชื่องาน / ลูกค้า / Engineer)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="เช่น ON/018-01/2026, Hydraulic, K.Pakorn..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              className={`${INPUT} min-w-0 max-w-[720px] flex-1`}
            />
            <button
              onClick={runSearch}
              className={`${BTN} shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:px-5`}
            >
              🔍 ค้นหา
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={`${BTN} shrink-0 rounded-lg border border-solid border-gray-200 bg-white px-3 py-2 text-gray-500 hover:bg-gray-50 sm:px-4`}
              >
                ✕ ล้าง
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-500">
              ผลค้นหา "{searchQuery}" ในปี {activeYear} — พบ{" "}
              <strong className="text-gray-900">{data.total}</strong> รายการ
            </div>
          )}
        </div>

        {/* Year Tabs — มือถือเลื่อนแนวนอนได้ถ้าปีเยอะ */}
        <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto border-b border-gray-200">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => switchYear(y)}
              className={`shrink-0 cursor-pointer border-x-0 border-b-2 border-t-0 border-solid bg-transparent px-[18px] py-2 text-[13px] ${
                activeYear === y
                  ? "border-blue-600 font-bold text-blue-600"
                  : "border-transparent font-medium text-gray-500 hover:text-gray-700"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* ── มือถือ / แท็บเล็ต (< lg): การ์ดทีละ record ── */}
        <div className="lg:hidden">
          {loading ? (
            emptyState("Loading...")
          ) : data.records.length === 0 ? (
            emptyState("No records found")
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.records.map((r) => {
                const linkedCount = r.linkedProjects?.length ?? 0;
                return (
                  <div
                    key={r.id}
                    className="rounded-[10px] border border-gray-200 bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="break-all text-[13px] font-bold">
                        {r.projectCode}
                      </div>
                      <StatusBadge linkedCount={linkedCount} />
                    </div>
                    <div className="mt-1 break-words text-[13px] text-gray-800">
                      {r.jobTitle}
                    </div>
                    <div className="mt-2 grid grid-cols-[72px_1fr] gap-y-0.5 text-xs">
                      <span className="text-gray-500">Customer</span>
                      <span className="break-words">
                        {r.customerName || "—"}
                      </span>
                      <span className="text-gray-500">Company</span>
                      <span className="break-words">{r.company || "—"}</span>
                      <span className="text-gray-500">Team</span>
                      <span className="break-words">{r.team || "—"}</span>
                    </div>
                    <div className="mt-3 flex gap-2 [&>button]:flex-1">
                      {renderRecordActions(r, linkedCount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── จอใหญ่ (lg+): ตาราง ── */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-gray-200 bg-white lg:flex">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {TABLE_HEADERS.map(([h, w], i) => (
                    <th
                      key={h}
                      className={`sticky top-0 z-[1] whitespace-nowrap bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-gray-500 shadow-[inset_0_-1px_0_#dee2e6] ${
                        i === 6 ? "text-center" : "text-left"
                      } ${w}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : data.records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  data.records.map((r, idx) => {
                    const linkedCount = r.linkedProjects?.length ?? 0;
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-gray-50 ${
                          idx < data.records.length - 1
                            ? "border-b border-gray-100"
                            : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {r.projectCode}
                        </td>
                        <td className="px-4 py-3">{r.jobTitle}</td>
                        <td className="px-4 py-3">{r.customerName || "—"}</td>
                        <td className="px-4 py-3">{r.company || "—"}</td>
                        <td className="px-4 py-3">{r.team || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge linkedCount={linkedCount} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            {renderRecordActions(r, linkedCount)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 px-1 py-3 text-xs text-gray-500 sm:px-4">
            <span>
              หน้า {data.page} / {data.totalPages} — ทั้งหมด {data.total} รายการ
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={PAGE_BTN}
              >
                ←<span className="hidden sm:inline"> ก่อนหน้า</span>
              </button>

              {getPageNumbers(page, data.totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="px-1 text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[30px] cursor-pointer rounded-md border border-solid px-2.5 py-1.5 text-xs ${
                      p === page
                        ? "border-blue-600 bg-blue-600 font-bold text-white"
                        : "border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className={PAGE_BTN}
              >
                <span className="hidden sm:inline">ถัดไป </span>→
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════ View Details Modal ════════ */}
      {viewingRecord && (
        <ModalShell onClose={() => setViewingRecord(null)} maxW="max-w-[640px]">
          <div className={MODAL_HEAD}>
            <div className="min-w-0">
              <div className="break-all text-base font-bold">
                {viewingRecord.projectCode}
              </div>
              <div className="mt-0.5 break-words text-xs opacity-[0.85]">
                {viewingRecord.jobTitle}
              </div>
            </div>
            <button onClick={() => setViewingRecord(null)} className={CLOSE_X}>
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {DETAIL_FIELDS.map(([key, label]) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="w-[120px] py-2 pr-3 align-top font-semibold text-gray-500 sm:w-[160px]">
                      {label}
                    </td>
                    <td className="break-words py-2 text-gray-900">
                      {formatDetailValue(key, viewingRecord[key])}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 font-semibold text-gray-500">
                    สถานะ
                  </td>
                  <td className="py-2">
                    <StatusBadge
                      linkedCount={viewingRecord.linkedProjects?.length ?? 0}
                      large
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={MODAL_FOOT}>
            <button
              onClick={() => setViewingRecord(null)}
              className={BTN_CANCEL}
            >
              ปิด
            </button>
            {(viewingRecord.linkedProjects?.length ?? 0) > 0 && (
              <button
                onClick={() => {
                  setViewingRecord(null);
                  setLinkedProjectsModal(viewingRecord);
                }}
                className="cursor-pointer rounded-lg border-none bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
              >
                ดูรายการ Project →
              </button>
            )}
            {canManageProjects && (
              <button
                onClick={() => {
                  setViewingRecord(null);
                  openStartModal(viewingRecord);
                }}
                className="cursor-pointer rounded-lg border-none bg-[#198754] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#157347]"
              >
                🚀 เปิดใช้งาน Project →
              </button>
            )}
          </div>
        </ModalShell>
      )}

      {/* ════════ Linked Projects Modal ════════ */}
      {linkedProjectsModal && (
        <ModalShell
          onClose={() => setLinkedProjectsModal(null)}
          maxW="max-w-[480px]"
        >
          <div className={MODAL_HEAD}>
            <span className="min-w-0 truncate text-base font-semibold">
              📂 Projects จาก {linkedProjectsModal.projectCode}
            </span>
            <button
              onClick={() => setLinkedProjectsModal(null)}
              className={CLOSE_X}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mb-3 break-words text-xs text-gray-500">
              {linkedProjectsModal.jobTitle}
            </div>

            {linkedProjectsModal.linkedProjects.map((p) => {
              const startPart = fmtShort(p.startDate);
              const endPart = fmtShort(p.endDate);
              const locationPart = p.location || null;
              const isDeleting = deletingId === p.id;

              return (
                <div
                  key={p.id}
                  className="mb-1.5 flex flex-col gap-2 rounded-md bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="break-words text-[13px] font-semibold">
                      {p.name}
                    </div>
                    {(locationPart || startPart) && (
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-gray-700">
                        {locationPart && <span>📍 {locationPart}</span>}
                        {startPart && (
                          <span>
                            🗓 {startPart}
                            {endPart ? ` – ${endPart}` : ""}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] text-gray-400">
                      สร้างเมื่อ {fmtCreatedAt(p.createdAt)}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1.5 self-end sm:self-auto">
                    {canManageProjects && (
                      <>
                        <button
                          onClick={() => openEditModal(p)}
                          title="แก้ไข"
                          className={`${BTN} ${LIFT_WHITE} px-2 py-1.5`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p)}
                          disabled={isDeleting}
                          title="ลบ"
                          className={`${BTN} ${LIFT_WHITE} px-2 py-1.5 text-red-600 disabled:hover:translate-y-0`}
                        >
                          {isDeleting ? "..." : "🗑"}
                        </button>
                      </>
                    )}
                    <Link
                      to={`/projects/${p.id}`}
                      className={`${BTN} ${LIFT_BLUE} px-3 py-1.5 no-underline`}
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3.5 sm:px-6">
            {canManageProjects && (
              <button
                onClick={() => {
                  const record = linkedProjectsModal;
                  setLinkedProjectsModal(null);
                  openStartModal(record);
                }}
                className="cursor-pointer rounded-lg border border-[#198754] bg-white px-4 py-2 text-[13px] font-semibold text-[#198754] hover:bg-emerald-50"
              >
                + Start อีกอันจาก ON นี้
              </button>
            )}
            <button
              onClick={() => setLinkedProjectsModal(null)}
              className={`${BTN_CANCEL} ml-auto`}
            >
              ปิด
            </button>
          </div>
        </ModalShell>
      )}

      {/* ════════ Start New Project Modal ════════ */}
      {startModalOpen && canManageProjects && (
        <ModalShell onClose={closeStartModal} maxW="max-w-[600px]">
          <div className={MODAL_HEAD}>
            <span className="text-base font-semibold">
              🚀 Start New Project
            </span>
            <button onClick={closeStartModal} className={CLOSE_X}>
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <label className={LABEL}>
              ON Number (Master Project Register) *
            </label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadMasterRecordOptions}
              value={selectedMasterRecord}
              onChange={(option) => {
                setSelectedMasterRecord(option);
                setStartContractId(
                  option?.record ? guessContract(option.record) : "",
                );
              }}
              placeholder="ค้นหา ON Number หรือชื่องาน..."
              isClearable
              noOptionsMessage={({ inputValue }) =>
                inputValue
                  ? "ไม่พบ ON Number ที่ตรงกัน"
                  : "พิมพ์เพื่อค้นหา ON Number..."
              }
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#dee2e6",
                  borderRadius: "8px",
                  minHeight: "38px",
                  fontSize: "13px",
                }),
                menuPortal: (base) => ({ ...base, zIndex: 1000001 }),
              }}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
            />

            {selectedMasterRecord && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <RecordSummaryGrid record={selectedMasterRecord.record} />
              </div>
            )}

            <div className="mt-4">
              <label className={LABEL}>Client / Contract *</label>
              <select
                value={startContractId}
                onChange={(e) => setStartContractId(e.target.value)}
                className={INPUT}
              >
                <option value="">Select client...</option>
                {clients.map((c) =>
                  c.contracts?.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {c.name} — {ct.name}
                    </option>
                  )),
                )}
              </select>
              <div className="mt-1.5 text-[11px] text-gray-400">
                Project Name จะใช้ชื่อจาก "Project / Job" ของ Master Register
                อัตโนมัติ
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Location / Site</label>
                <input
                  type="text"
                  placeholder="e.g., Offshore Platform A"
                  value={startForm.location}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>Onshore / Offshore</label>
                <select
                  value={startForm.isOffshore ? "offshore" : "onshore"}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      isOffshore: e.target.value === "offshore",
                    }))
                  }
                  className={INPUT}
                >
                  <option value="onshore">Onshore</option>
                  <option value="offshore">Offshore (นอกชายฝั่ง)</option>
                </select>
              </div>

              <div>
                <label className={LABEL}>Start Date</label>
                <input
                  type="date"
                  value={startForm.startDate}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>End Date</label>
                <input
                  type="date"
                  value={startForm.endDate}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* <div>
                <label className={LABEL}>ขาไป (วิธีเดินทาง)</label>
                <select
                  value={startForm.travelMode}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      travelMode: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {TRAVEL_MODE_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div> */}
              <TravelModeField form={startForm} setForm={setStartForm} />
              <div>
                <label className={LABEL}>พนักงานต้องตอบรับภายใน (วัน)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={startForm.responseDays}
                  onChange={(e) =>
                    setStartForm((prev) => ({
                      ...prev,
                      responseDays: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <div className="mt-1 text-[11px] text-gray-400">
                  นับจากวันที่ approve ที่หน้า Allocation — แสดงให้พนักงานเห็นใน
                  Worker App
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL}>Notes</label>
              <textarea
                rows={3}
                value={startForm.notes}
                onChange={(e) =>
                  setStartForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className={`${INPUT} resize-y`}
              />
            </div>
          </div>

          <div className={MODAL_FOOT}>
            <button onClick={closeStartModal} className={BTN_CANCEL}>
              Cancel
            </button>
            <button
              onClick={handleStartSubmit}
              disabled={startDisabled}
              className={`rounded-lg border-none px-5 py-2 text-[13px] font-semibold text-white ${
                startDisabled
                  ? "cursor-not-allowed bg-gray-400"
                  : "cursor-pointer bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {starting ? "กำลังเปิดใช้งาน..." : "เปิดใช้งาน →"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ════════ Edit Project Modal ════════ */}
      {editingProject && canManageProjects && (
        <ModalShell
          onClose={closeEditModal}
          zClass="z-[1000002]"
          maxW="max-w-[560px]"
        >
          <div className={MODAL_HEAD}>
            <div className="min-w-0">
              <div className="text-base font-semibold">✏️ Edit Project</div>
              <div className="mt-0.5 break-words text-xs opacity-80">
                {editingProject.name}
              </div>
            </div>
            <button onClick={closeEditModal} className={CLOSE_X}>
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Location / Site</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Onshore / Offshore</label>
                <select
                  value={editForm.isOffshore ? "offshore" : "onshore"}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isOffshore: e.target.value === "offshore",
                    }))
                  }
                  className={INPUT}
                >
                  <option value="onshore">Onshore</option>
                  <option value="offshore">Offshore (นอกชายฝั่ง)</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Start Date</label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>End Date</label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* <div>
                <label className={LABEL}>ขาไป (วิธีเดินทาง)</label>
                <select
                  value={editForm.travelMode}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      travelMode: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {TRAVEL_MODE_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div> */}
              <TravelModeField form={editForm} setForm={setEditForm} />
              <div>
                <label className={LABEL}>พนักงานต้องตอบรับภายใน (วัน)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={editForm.responseDays}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      responseDays: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
                <div className="mt-1 text-[11px] text-gray-400">
                  นับจากวันที่ approve ที่หน้า Allocation — แสดงให้พนักงานเห็นใน
                  Worker App
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL}>Notes</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className={`${INPUT} resize-y`}
              />
            </div>
          </div>

          <div className={MODAL_FOOT}>
            <button onClick={closeEditModal} className={BTN_CANCEL}>
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={savingEdit}
              className={`rounded-lg border-none px-5 py-2 text-[13px] font-semibold text-white ${
                savingEdit
                  ? "cursor-not-allowed bg-gray-400"
                  : "cursor-pointer bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {savingEdit ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
