import { useState, useEffect, useContext } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import RequestBookingModal from "./RequestBookingModal";

// ══════════════════════════════════════════════════════════
// Training Bookings  (/requests-history)    → <RequestsHistory type="training" />
// Medical Bookings   (/medical-bookings)    → <RequestsHistory type="medical" />
// คำขอจากหลายที่มารวมที่นี่ให้ HR จัดการ:
//   • ปุ่ม "Request training" ในหน้านี้ (การ์ดเดียว แบบโปรแกรมตัวอย่าง)
//   • Training Courses › "แจ้ง HR ให้จัด Training"
//   • Assign Names › ดู Gap (Training) / 📨 แจ้ง HR (Medical)
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
const LAST_VIEWED_KEY = "trainingRequestLastViewed";
const PAGE_SIZE = 15;

const readLastViewed = () => {
  try {
    const raw = localStorage.getItem(LAST_VIEWED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLastViewed = (id) => {
  try {
    localStorage.setItem(
      LAST_VIEWED_KEY,
      JSON.stringify({ id, viewedAt: Date.now() }),
    );
  } catch {
    // localStorage อาจไม่พร้อมใช้งาน — ไม่ critical
  }
};

const timeAgoLabel = (timestamp) => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`;
};

const fmtDM = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
const whenText = (r) =>
  r.requestedStart
    ? `${fmtDM(r.requestedStart)}${r.requestedEnd && r.requestedEnd !== r.requestedStart ? ` – ${fmtDM(r.requestedEnd)}` : ""}`
    : "";

const fmtDateTime = (d) =>
  new Date(d).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// วันที่แบบ local "YYYY-MM-DD" (ใช้กับ <input type="date">)
const toYMD = (d) => {
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const daysAgoYMD = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
};

// เรียงค่าไม่ซ้ำ (ใช้สร้างตัวเลือกใน dropdown)
const uniqSorted = (arr) =>
  [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const getPageNumbers = (current, total) => {
  const delta = 2;
  const range = [];
  const withDots = [];
  let last;
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    )
      range.push(i);
  }
  range.forEach((i) => {
    if (last) {
      if (i - last === 2) withDots.push(last + 1);
      else if (i - last > 2) withDots.push("...");
    }
    withDots.push(i);
    last = i;
  });
  return withDots;
};

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
// ช่วงวันที่สำเร็จรูป — days = null คือไม่จำกัด
const DATE_PRESETS = [
  ["all", "ทั้งหมด", null],
  ["today", "วันนี้", 0],
  ["7d", "7 วัน", 6],
  ["30d", "30 วัน", 29],
  ["90d", "90 วัน", 89],
];

const STATUS_TABS = [
  ["pending", "⏳ รอ HR จัดการ", "border-amber-500 bg-amber-50 text-amber-800"],
  ["completed", "✓ จัดแล้ว", "border-emerald-600 bg-emerald-50 text-emerald-800"],
  ["all", "ทั้งหมด", "border-gray-700 bg-gray-700 text-white"],
];

// CSV (ใส่ BOM ให้ Excel อ่านภาษาไทยได้)
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const downloadCsv = (filename, rows) => {
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const TH =
  "whitespace-nowrap bg-gray-50 px-4 py-2 text-left text-[11px] font-semibold tracking-[0.5px] text-gray-500";
const TD = "px-4 py-3 text-[13px]";
const FILTER_LABEL = "mb-1 block text-[11px] font-semibold text-gray-500";
const FIELD_BASE =
  "box-border h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 outline-none focus:border-blue-500";
const FIELD = `${FIELD_BASE} w-full`;
const DATE_FIELD = `${FIELD_BASE} w-[140px]`;
const TOOL_BTN =
  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 no-underline hover:bg-gray-50";
const CHIP =
  "cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs";
const PAGE_BTN =
  "min-w-[30px] cursor-pointer rounded-md border px-2.5 py-[5px] text-xs disabled:cursor-not-allowed disabled:opacity-50";

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
// สถานะรายคน (HR ยืนยัน / ปฏิเสธ) — ถ้ามีข้อมูล counts จาก backend
function StatusBadge({ status, counts }) {
  if (counts && counts.confirmed + counts.rejected > 0) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
        {counts.pending > 0 && (
          <span className="rounded-md bg-[#fff3cd] px-2 py-px text-[#664d03]">⏳ รอ HR {counts.pending}</span>
        )}
        {counts.confirmed > 0 && (
          <span className="rounded-md bg-[#d1e7dd] px-2 py-px text-[#0f5132]">✓ ยืนยัน {counts.confirmed}</span>
        )}
        {counts.rejected > 0 && (
          <span className="rounded-md bg-[#f8d7da] px-2 py-px text-[#842029]">✕ ปฏิเสธ {counts.rejected}</span>
        )}
      </div>
    );
  }
  const done = status === "completed";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2.5 py-[3px] text-[11px] font-semibold ${
        done ? "bg-[#d1e7dd] text-[#0f5132]" : "bg-[#fff3cd] text-[#664d03]"
      }`}
    >
      {done ? "✓ จัดแล้ว" : "⏳ รอ HR"}
    </span>
  );
}

function TrainingTags({ names = [] }) {
  return (
    <div className="flex flex-wrap gap-1" title={names.join(", ")}>
      {names.slice(0, 2).map((name, i) => (
        <span
          key={i}
          className="rounded bg-gray-200 px-1.5 py-px text-[11px] text-gray-700"
        >
          {name}
        </span>
      ))}
      {names.length > 2 && (
        <span
          className="cursor-help text-[11px] text-gray-500"
          title={names.slice(2).join(", ")}
        >
          +{names.length - 2} more
        </span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function RequestsHistory({ type }) {
  const [searchParams] = useSearchParams();
  // ลิงก์เก่า /requests-history?type=medical → หน้า Medical Bookings
  if (!type && searchParams.get("type") === "medical")
    return <Navigate to="/medical-bookings" replace />;
  const t = type === "medical" ? "medical" : "training";
  return <BookingsPage key={t} requestType={t} />;
}

function BookingsPage({ requestType }) {
  const navigate = useNavigate();
  const { backendUrl, userData } = useContext(AppContent);
  const isAdmin = userData?.role?.name === "admin";
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [trainingFilter, setTrainingFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [lastViewed, setLastViewedState] = useState(() => readLastViewed());
  const [, setTick] = useState(0);

  const isTraining = requestType === "training";
  const apiBase = `${backendUrl}/api/${isTraining ? "training-requests" : "medical-requests"}`;

  useEffect(() => {
    setLoading(true);
    setRequests([]); // เคลียร์ของเก่าทันทีตอนสลับ tab
    axios
      .get(apiBase, { withCredentials: true })
      .then((res) => setRequests(res.data))
      .catch((err) => {
        console.error(err);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [apiBase, reloadKey]);

  // อัปเดตข้อความ "ดูล่าสุด X นาทีที่แล้ว" ทุก 30 วินาที
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ล้าง filter ทั้งหมด (ยกเว้นสถานะ)
  const resetFilters = () => {
    setSearch("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setRequesterFilter("");
    setTrainingFilter("");
    setClientFilter("");
    setPage(1);
  };

  const applyPreset = (key, days) => {
    setDatePreset(key);
    setDateFrom(days === null ? "" : daysAgoYMD(days));
    setDateTo(days === null ? "" : toYMD(new Date()));
    setPage(1);
  };

  // แก้วันที่เอง → ไม่ใช่ preset แล้ว
  const setDate = (setter) => (e) => {
    setter(e.target.value);
    setDatePreset("");
    setPage(1);
  };

  // wrapper: เปลี่ยน filter แล้วกลับไปหน้า 1
  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const requestPath = (id) =>
    isTraining ? `/training-requests/${id}` : `/medical-requests/${id}`;

  // จำว่าเปิดดูคำขอไหนล่าสุด (แถบ "👁 ดูล่าสุด")
  const markViewed = (id) => {
    writeLastViewed(id);
    setLastViewedState({ id, viewedAt: Date.now() });
  };

  // คลิกทั้งแถว/การ์ด
  const goToRequest = (id) => {
    markViewed(id);
    navigate(requestPath(id));
  };

  const toggleStatus = async (r, e) => {
    e.stopPropagation();
    const newStatus = r.status === "completed" ? "pending" : "completed";
    try {
      setTogglingId(r.id);
      await axios.patch(
        `${apiBase}/${r.id}`,
        { status: newStatus },
        { withCredentials: true },
      );
      setRequests((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: newStatus } : x)),
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (r, e) => {
    e.stopPropagation();
    const typeLabel = isTraining ? "training" : "medical check-up";
    if (
      !window.confirm(
        `ยืนยันลบคำขอ ${typeLabel} ของ "${r.requestedByName || "—"}" ?\n(ลบแล้วกู้คืนไม่ได้)`,
      )
    )
      return;
    try {
      setDeletingId(r.id);
      await axios.delete(`${apiBase}/${r.id}`, { withCredentials: true });
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  // ตัวเลือก dropdown — สร้างจากข้อมูลจริงของ tab ปัจจุบัน
  const requesterOptions = uniqSorted(requests.map((r) => r.requestedByName));
  const trainingOptions = uniqSorted(
    requests.flatMap((r) => r.trainingNames || []),
  );
  const clientOptions = uniqSorted(requests.flatMap((r) => r.clientNames || []));

  // กรองทุกอย่าง "ยกเว้นสถานะ" — ใช้นับตัวเลขบนปุ่มสถานะให้ตรงกับ filter อื่น
  const baseFiltered = requests.filter((r) => {
    const ymd = toYMD(r.createdAt);
    if (dateFrom && ymd < dateFrom) return false;
    if (dateTo && ymd > dateTo) return false;
    if (requesterFilter && r.requestedByName !== requesterFilter) return false;
    if (trainingFilter && !(r.trainingNames || []).includes(trainingFilter))
      return false;
    if (clientFilter && !(r.clientNames || []).includes(clientFilter))
      return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      r.requestedByName,
      ...(r.trainingNames || []),
      ...(r.clientNames || []),
    ].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const filtered = baseFiltered.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  const exportCsv = () =>
    downloadCsv(
      `${isTraining ? "training" : "medical"}-bookings-${toYMD(new Date())}.csv`,
      [
        ["Requested By", "Date", "Employees", isTraining ? "Trainings" : "Check Type", "Requested dates", "Provider", "Remarks", "Client", "Status"],
        ...filtered.map((r) => [
          r.requestedByName || "",
          fmtDateTime(r.createdAt),
          r.employeeCount,
          isTraining ? (r.trainingNames || []).join("; ") : "Medical Check-up",
          whenText(r),
          r.provider || "",
          r.remarks || "",
          (r.clientNames || []).join("; "),
          r.status === "completed" ? "จัดแล้ว" : "รอ HR",
        ]),
      ],
    );

  const hasFilter =
    search ||
    dateFrom ||
    dateTo ||
    requesterFilter ||
    trainingFilter ||
    clientFilter;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // กันหน้าเกินจำนวนจริง เช่นลบ/ทำเสร็จรายการสุดท้ายของหน้าสุดท้าย
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const emptyText = loading
    ? "Loading..."
    : hasFilter
      ? "ไม่พบคำขอตามเงื่อนไขที่เลือก"
      : isTraining
        ? "ยังไม่มีคำขอ training"
        : "ยังไม่มีคำขอ medical check-up";

  // ── ส่วนที่ใช้ทั้งตารางและการ์ด ──
  const renderRequester = (r) => {
    const isLastViewed = lastViewed?.id === r.id;
    return (
      <>
        <span className="font-semibold">{r.requestedByName || "—"}</span>
        {isLastViewed && (
          <span className="mt-0.5 block text-[10px] font-medium text-blue-600">
            👁 ดูล่าสุด {timeAgoLabel(lastViewed.viewedAt)}
          </span>
        )}
      </>
    );
  };

  const renderSubject = (r) =>
    isTraining ? (
      <TrainingTags names={r.trainingNames || []} />
    ) : (
      <span className="text-gray-700">🏥 Medical Check-up</span>
    );

  const renderWhen = (r) =>
    whenText(r) || r.provider ? (
      <div className="leading-tight">
        <div className="whitespace-nowrap">{whenText(r) || "—"}</div>
        {r.provider && <div className="text-[11px] text-gray-500">{r.provider}</div>}
      </div>
    ) : (
      <span className="text-gray-400">—</span>
    );

  const renderClients = (r) =>
    r.clientNames?.length > 0 ? r.clientNames.join(", ") : "—";

  const renderActions = (r) => {
    const done = r.status === "completed";
    return (
      <div
        className="flex flex-nowrap items-center justify-end gap-2 lg:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => toggleStatus(r, e)}
          disabled={togglingId === r.id}
          title={
            done
              ? "คลิกเพื่อเปลี่ยนกลับเป็น รอดำเนินการ"
              : "คลิกเพื่อทำเครื่องหมายว่าเสร็จแล้ว"
          }
          className={`cursor-pointer whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:cursor-wait disabled:opacity-60 ${
            done
              ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              : "border-[#198754] bg-[#198754] text-white hover:bg-[#157347]"
          }`}
        >
          {done ? "↩ ทำเป็นค้าง" : "✓ ทำเสร็จแล้ว"}
        </button>
        {/* ลิงก์จริง — คลิกขวา / Ctrl+คลิก / คลิกล้อกลาง เปิดแท็บใหม่ได้ */}
        <Link
          to={requestPath(r.id)}
          onClick={() => markViewed(r.id)}
          onAuxClick={() => markViewed(r.id)}
          className="whitespace-nowrap text-xs font-semibold text-blue-600 no-underline hover:underline"
        >
          ดู →
        </Link>
        {isAdmin && (
          <button
            onClick={(e) => handleDelete(r, e)}
            disabled={deletingId === r.id}
            title="ลบคำขอนี้ (admin เท่านั้น)"
            className="cursor-pointer rounded-md border border-[#f5c6cb] bg-white px-2 py-1 text-[11px] text-[#dc3545] hover:bg-red-50 disabled:cursor-not-allowed"
          >
            {deletingId === r.id ? "…" : "🗑"}
          </button>
        )}
      </div>
    );
  };

  const rowBg = (r) =>
    lastViewed?.id === r.id ? "bg-[#f0f7ff]" : "bg-white hover:bg-gray-50";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ หัวหน้า + ปุ่มหลัก ════════ */}
      <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-bold">
            {isTraining ? "Training Bookings" : "Medical Bookings"}
          </h1>
          <div className="text-xs text-gray-500">
            {isTraining
              ? "คำขอจัดอบรมถึง HR — จากปุ่ม Request training, หน้า Training Courses และ Assign Names"
              : "คำขอนัดตรวจสุขภาพถึง HR — จากปุ่ม Request medical และ Assign Names"}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={exportCsv} className={TOOL_BTN}>
            ⬇ Export CSV
          </button>
          {isTraining && (
            <Link
              to="/certifications/bulk-add"
              className={TOOL_BTN}
              title="อบรมเสร็จแล้ว → บันทึก certification ให้ทั้งกลุ่มทีเดียว"
            >
              ✓ บันทึกผลอบรม (Bulk Add Certification)
            </Link>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border-none bg-[#2B2F78] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#22265f]"
          >
            {isTraining ? "🎓 Request training" : "🏥 Request medical"}
          </button>
        </div>
      </div>

      {/* ════════ ตัวกรอง (แถบเดียว ไม่ห่อ card) ════════ */}
      <div className="border-y border-gray-200 py-3">
        <div
          className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
            isTraining
              ? "lg:grid-cols-[2fr_1fr_1.5fr_1fr]"
              : "lg:grid-cols-[2fr_1fr_1fr]"
          }`}
        >
          <div className="min-w-0">
            <label className={FILTER_LABEL}>ค้นหา</label>
            <input
              type="text"
              placeholder={
                isTraining
                  ? "ชื่อผู้ขอ / ชื่อ training / client..."
                  : "ชื่อผู้ขอ / client..."
              }
              value={search}
              onChange={onFilter(setSearch)}
              className={FIELD}
            />
          </div>
          <div className="min-w-0">
            <label className={FILTER_LABEL}>ผู้ขอ</label>
            <select
              value={requesterFilter}
              onChange={onFilter(setRequesterFilter)}
              className={FIELD}
            >
              <option value="">ทั้งหมด</option>
              {requesterOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {isTraining && (
            <div className="min-w-0">
              <label className={FILTER_LABEL}>Training</label>
              <select
                value={trainingFilter}
                onChange={onFilter(setTrainingFilter)}
                className={FIELD}
              >
                <option value="">ทั้งหมด</option>
                {trainingOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="min-w-0">
            <label className={FILTER_LABEL}>Client</label>
            <select
              value={clientFilter}
              onChange={onFilter(setClientFilter)}
              className={FIELD}
            >
              <option value="">ทั้งหมด</option>
              {clientOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500">วันที่ส่งคำขอ</span>
          {DATE_PRESETS.map(([key, label, days]) => (
            <button
              key={key}
              onClick={() => applyPreset(key, days)}
              className={`${CHIP} ${
                datePreset === key
                  ? "border-[#2B2F78] bg-[#2B2F78] font-bold text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
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
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="ml-auto cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-[#dc3545] underline hover:text-[#a71d2a]"
            >
              ✕ ล้าง filter
            </button>
          )}
        </div>
      </div>

      {/* ════════ รายการ (ไม่ห่อ card — ใช้เส้นแบ่ง) ════════ */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map(([key, label, activeCls]) => {
            const count =
              key === "all"
                ? baseFiltered.length
                : baseFiltered.filter((r) => r.status === key).length;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                  active
                    ? `${activeCls} font-bold`
                    : "border-gray-200 bg-white font-medium text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
          </div>
          <span className="text-xs text-gray-500">
            พบ <strong className="text-gray-900">{filtered.length}</strong>{" "}
            รายการ
          </span>
        </div>
        {/* ── ต่ำกว่า lg: การ์ด ── */}
        <div className="lg:hidden">
          {paged.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-gray-500">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 py-3 md:grid-cols-2">
              {paged.map((r) => (
                <div
                  key={r.id}
                  onClick={() => goToRequest(r.id)}
                  className={`cursor-pointer rounded-lg border border-gray-200 p-3 text-[13px] ${rowBg(r)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">{renderRequester(r)}</div>
                    <StatusBadge status={r.status} counts={r.counts} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {fmtDateTime(r.createdAt)} · 👤 {r.employeeCount} คน
                    {r.clientNames?.length > 0 && ` · ${renderClients(r)}`}
                  </div>
                  {(whenText(r) || r.provider) && (
                    <div className="mt-1 text-xs text-gray-600">
                      📅 {whenText(r) || "—"}
                      {r.provider && ` · ${r.provider}`}
                    </div>
                  )}
                  <div className="mt-2">{renderSubject(r)}</div>
                  <div className="mt-2.5 border-t border-gray-100 pt-2.5">
                    {renderActions(r)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── lg+: ตาราง ── */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-gray-200">
                <th className={TH}>Requested By</th>
                <th className={TH}>Date</th>
                <th className={TH}>Employees</th>
                <th className={TH}>
                  {isTraining ? "Trainings" : "Check Type"}
                </th>
                <th className={TH}>ช่วงวันที่ / สถานที่</th>
                <th className={TH}>Client</th>
                <th className={`${TH} w-[120px] text-center`}>Status</th>
                <th className={`${TH} w-[220px] text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                paged.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => goToRequest(r.id)}
                    className={`cursor-pointer ${rowBg(r)} ${
                      idx < paged.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <td className={TD}>{renderRequester(r)}</td>
                    <td className={`${TD} whitespace-nowrap text-gray-500`}>
                      {fmtDateTime(r.createdAt)}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      👤 {r.employeeCount} คน
                    </td>
                    <td className={`${TD} max-w-[260px]`}>
                      {renderSubject(r)}
                    </td>
                    <td className={TD}>{renderWhen(r)}</td>
                    <td className={`${TD} text-gray-500`}>
                      {renderClients(r)}
                    </td>
                    <td className={`${TD} text-center`}>
                      <StatusBadge status={r.status} counts={r.counts} />
                    </td>
                    <td className={TD}>{renderActions(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ════════ Pagination ════════ */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-gray-200 py-3 text-xs text-gray-500">
            <span>
              หน้า {currentPage} / {totalPages} — ทั้งหมด {filtered.length}{" "}
              รายการ
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className={`${PAGE_BTN} border-gray-200 bg-white text-gray-700`}
              >
                ←<span className="hidden sm:inline"> ก่อนหน้า</span>
              </button>
              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="px-1 text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`${PAGE_BTN} ${
                      p === currentPage
                        ? "border-blue-600 bg-blue-600 font-bold text-white"
                        : "border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className={`${PAGE_BTN} border-gray-200 bg-white text-gray-700`}
              >
                <span className="hidden sm:inline">ถัดไป </span>→
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <RequestBookingModal
          type={requestType}
          onClose={() => setModalOpen(false)}
          onSent={(n) => {
            setModalOpen(false);
            setStatusFilter("pending");
            setReloadKey((k) => k + 1);
            alert(`ส่งคำขอถึง HR แล้ว (${n} คน)`);
          }}
        />
      )}
    </div>
  );
}
