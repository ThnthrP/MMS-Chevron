import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
const TONE = {
  ok: {
    active: "border-[#0f5132] bg-[#d1e7dd] text-[#0f5132]",
    hover: "hover:border-[#0f5132] hover:bg-[#d1e7dd]",
  },
  warn: {
    active: "border-[#664d03] bg-[#fff3cd] text-[#664d03]",
    hover: "hover:border-[#664d03] hover:bg-[#fff3cd]",
  },
  danger: {
    active: "border-[#842029] bg-[#f8d7da] text-[#842029]",
    hover: "hover:border-[#842029] hover:bg-[#f8d7da]",
  },
};

const REHIRE = [
  ["yes", "Yes", "ok"],
  ["maybe", "Maybe", "warn"],
  ["no", "No", "danger"],
];

const CARD = "rounded-[10px] border border-gray-200 bg-white";
const FILTER_LABEL = "mb-1 block text-[11px] font-semibold text-gray-500";
const STATUS_FILTERS = [
  ["all", "ทั้งหมด"],
  ["active", "Active"],
  ["completed", "Completed"],
];
const TH =
  "whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.3px] text-gray-500";
const TD = "border-b border-gray-100 px-3 py-2.5 align-middle text-[13px]";

// react-select ใช้ styles API ของไลบรารี
const projectSelectStyles = {
  control: (p) => ({
    ...p,
    borderColor: "#ced4da",
    borderRadius: "8px",
    minHeight: "40px",
    fontSize: "14px",
    boxShadow: "none",
    "&:hover": { borderColor: "#86b7fe" },
  }),
  option: (p) => ({ ...p, fontSize: "13px" }),
  placeholder: (p) => ({ ...p, fontSize: "14px", color: "#6c757d" }),
  menuPortal: (p) => ({ ...p, zIndex: 9999 }),
  // มือถือ: ไม่ให้เมนูกว้างเกินจอ
  menu: (p) => ({ ...p, minWidth: "min(560px, calc(100vw - 24px))" }),
  menuList: (p) => ({ ...p, maxHeight: "360px" }),
  // ข้อความที่เลือกแล้วขึ้นบรรทัดใหม่ได้ ไม่ตัด ...
  singleValue: (p) => ({
    ...p,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "visible",
    lineHeight: "1.3",
  }),
  valueContainer: (p) => ({ ...p, padding: "6px 8px" }),
};

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
// YYYY-MM-DD ตามเวลาเครื่อง (เดิมใช้ toISOString() ซึ่งเป็นเวลา UTC
// วันที่อาจเลื่อนไป 1 วันถ้า backend เก็บเป็นเวลาไทย)
const ymd = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA");
};

const fmtProjectDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
function StatusBadge({ completed }) {
  return (
    <span
      className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        completed
          ? "bg-[#d1e7dd] text-[#0f5132]"
          : "bg-[#cfe2ff] text-[#084298]"
      }`}
    >
      {completed ? "Completed" : "Active"}
    </span>
  );
}

function Stars({ value, onChange, disabled }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => !disabled && onChange(n)}
          disabled={disabled}
          aria-label={`${n} star`}
          className={`select-none border-none bg-transparent p-0 text-lg leading-none ${
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${n <= value ? "text-[#f5a623]" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RehirePicker({ value, touched, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {REHIRE.map(([key, label, tone]) => {
        const active = value === key;
        // "Maybe" ที่เป็นค่า default ยังไม่ได้ตั้งใจเลือก → กรอบประ สีจาง
        const unconfirmed = active && key === "maybe" && !touched;
        const cls = active
          ? unconfirmed
            ? "border-dashed border-[#664d03] bg-white text-gray-400"
            : TONE[tone].active
          : `border-gray-200 bg-white text-gray-400 ${disabled ? "" : TONE[tone].hover}`;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            className={`rounded-md border px-2.5 py-[3px] text-[11px] font-semibold transition-colors ${cls} ${
              disabled ? "cursor-default" : "cursor-pointer"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function PostProjectReview() {
  const { backendUrl, userData } = useContext(AppContent);

  // ทุกคนที่เข้าหน้านี้ได้ จัดการ review ได้เต็มสิทธิ์ (คุมสิทธิ์ที่ AppRouter)
  const canManageReview = true;

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "review_projectId",
    "",
  );
  // เปิดจากลิงก์ ?projectId=... (เช่น Manpower Calendar › ผู้ประเมิน) → เลือกโปรเจกต์นั้นให้เลย
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qp = searchParams.get("projectId");
    if (qp) {
      setSelectedProjectId(qp);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // กรองรายการโปรเจกต์ใน dropdown

  const fetchProjects = () =>
    axios
      .get(`${backendUrl}/api/review/projects`, { withCredentials: true })
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err));

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  const buildRows = (workers) =>
    workers.map((w) => ({
      ...w,
      rating: w.review?.rating ?? 0,
      rehire: w.review?.rehire ?? "maybe", // ค่าที่จะส่งจริงถ้ากด save — ตรงกับ DB default
      rehireTouched: !!w.review, // ผู้ใช้เคยเลือกจริงแล้วหรือยัง
      comment: w.review?.comment ?? "",
      saved: !!w.review,
      dirty: false,
    }));

  const fetchDetail = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/review/${projectId}`, {
        withCredentials: true,
      });
      setProject(res.data.project);
      setRows(buildRows(res.data.workers));
    } catch (err) {
      console.error(err);
      setProject(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setRows([]);
      return;
    }
    fetchDetail(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const updateRow = (employeeId, patch) =>
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId ? { ...r, ...patch, dirty: true } : r,
      ),
    );

  const saveRow = async (row) => {
    if (!row.rating) {
      alert("ใส่คะแนน (rating) ก่อนบันทึก");
      return;
    }
    try {
      setSavingId(row.employeeId);
      await axios.post(
        `${backendUrl}/api/review`,
        {
          projectId: project.id,
          employeeId: row.employeeId,
          rating: row.rating,
          rehire: row.rehire,
          comment: row.comment,
          reviewedById: userData?.id ?? null,
        },
        { withCredentials: true },
      );
      setRows((prev) =>
        prev.map((r) =>
          r.employeeId === row.employeeId
            ? { ...r, saved: true, dirty: false, rehireTouched: true }
            : r,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save failed — ดู console");
    } finally {
      setSavingId(null);
    }
  };

  const markCompleted = async () => {
    if (!project || project.status === "completed") return;

    const unsaved = rows.filter((r) => r.dirty || !r.saved).length;
    const warn =
      unsaved > 0 ? `\n\n⚠ ยังมี ${unsaved} คนที่ยังไม่ได้บันทึก review` : "";
    if (
      !window.confirm(
        `ปิดโปรเจกต์ "${project.name}"? (assignment ทั้งหมดจะถูก mark completed)${warn}`,
      )
    )
      return;

    try {
      setCompleting(true);
      await axios.put(
        `${backendUrl}/api/review/complete`,
        { projectId: project.id },
        { withCredentials: true },
      );
      await Promise.all([fetchDetail(project.id), fetchProjects()]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Complete failed — ดู console");
    } finally {
      setCompleting(false);
    }
  };

  const isProjectCompleted = (p) => p.status === "completed";
  const countBy = (key) =>
    key === "all"
      ? projects.length
      : projects.filter((p) =>
          key === "completed" ? isProjectCompleted(p) : !isProjectCompleted(p),
        ).length;

  const projectOptions = projects
    .filter(
      (p) =>
        statusFilter === "all" ||
        (statusFilter === "completed"
          ? isProjectCompleted(p)
          : !isProjectCompleted(p)),
    )
    .map((p) => {
    const codePart = p.masterProjectRecord?.projectCode
      ? `[${p.masterProjectRecord.projectCode}] `
      : "";
    const parts = [];
    if (p.location) parts.push(p.location);
    const start = fmtProjectDate(p.startDate);
    if (start) parts.push(`Start ${start}`);
    const disambiguator =
      parts.length > 0 ? parts.join(" · ") : `#${p.id.slice(-6)}`;
    const clientPart = p.client ? ` — ${p.client}` : "";
    const statusPart = p.status === "completed" ? " (completed)" : "";
    return {
      value: p.id,
      label: `${codePart}${p.name}${clientPart} · ${disambiguator}${statusPart}`,
    };
    });

  // โปรเจกต์ที่เลือกไว้อาจถูกกรองออกจาก dropdown — ยังแสดงค่าเดิมไว้
  const selectedOption =
    projectOptions.find((o) => o.value === selectedProjectId) ||
    (project && project.id === selectedProjectId
      ? { value: project.id, label: project.name }
      : null);

  const isCompleted = project?.status === "completed";
  const canComplete = canManageReview && project && !isCompleted && !completing;
  const reviewedCount = rows.filter((r) => r.saved && !r.dirty).length;

  // ── ส่วนที่ใช้ทั้งตารางและการ์ด ──
  const renderSave = (r) => {
    if (!canManageReview)
      return <span className="text-[11px] text-gray-400">—</span>;
    const needsSave = r.dirty || !r.saved;
    const saving = savingId === r.employeeId;
    return (
      <button
        type="button"
        onClick={() => saveRow(r)}
        disabled={!needsSave || saving}
        className={`whitespace-nowrap rounded-md border-none px-3 py-[5px] text-xs font-semibold transition-all ${
          needsSave
            ? "cursor-pointer bg-blue-600 text-white shadow-[0_1px_3px_rgba(13,110,253,0.3),0_1px_2px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:shadow-[0_3px_6px_rgba(13,110,253,0.4),0_2px_3px_rgba(0,0,0,0.08)] disabled:cursor-wait disabled:opacity-70"
            : "cursor-default bg-[#d1e7dd] text-[#0f5132]"
        }`}
      >
        {saving ? "Saving…" : needsSave ? "Save" : "✓ Saved"}
      </button>
    );
  };

  const renderComment = (r) => (
    <input
      type="text"
      placeholder="หมายเหตุ…"
      value={r.comment}
      disabled={!canManageReview}
      onChange={(e) => updateRow(r.employeeId, { comment: e.target.value })}
      className="box-border w-full min-w-[160px] rounded-md border border-gray-300 bg-white px-2 py-[5px] text-xs outline-none focus:border-blue-400 disabled:bg-gray-50"
    />
  );

  const renderRehire = (r) => (
    <RehirePicker
      value={r.rehire}
      touched={r.rehireTouched}
      disabled={!canManageReview}
      onChange={(key) =>
        updateRow(r.employeeId, { rehire: key, rehireTouched: true })
      }
    />
  );

  const renderStars = (r) => (
    <Stars
      value={r.rating}
      disabled={!canManageReview}
      onChange={(n) => updateRow(r.employeeId, { rating: n })}
    />
  );

  const emptyBox = (text) => (
    <div className="p-7 text-center text-[13px] text-gray-500">{text}</div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div className={`${CARD} p-4 sm:p-[18px]`}>
        <div className="text-xl font-extrabold">⭐ Post-Project Review</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-md bg-[#e7e9ec] px-2 py-0.5 font-bold">
            Phase 4
          </span>
          Step 12: Performance Review → Status: 'Available'
        </div>
      </div>

      {/* ════════ เลือกโปรเจกต์ ════════ */}
      <div className={`${CARD} mt-4 px-4 py-3.5 sm:px-[18px]`}>
        <div className="mb-3 text-[13px] font-bold text-gray-900">
          🔍 เลือกโปรเจกต์
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="shrink-0">
            <label className={FILTER_LABEL}>สถานะโปรเจกต์</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(([key, label]) => {
                const active = statusFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`h-10 cursor-pointer whitespace-nowrap rounded-md border px-3.5 text-xs ${
                      active
                        ? "border-blue-600 bg-blue-600 font-bold text-white"
                        : "border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label} ({countBy(key)})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-full min-w-0 lg:max-w-[760px] lg:flex-1">
            <label className={FILTER_LABEL}>
              Project (ON Number / ชื่องาน / Client / Location)
            </label>
            <Select
              options={projectOptions}
              styles={projectSelectStyles}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              value={selectedOption}
              onChange={(o) => setSelectedProjectId(o ? o.value : "")}
              placeholder="🔍 พิมพ์ค้นหา หรือเลือกโปรเจกต์..."
              isClearable
              noOptionsMessage={() => "ไม่พบโปรเจกต์"}
            />
          </div>
        </div>
      </div>

      {/* ════════ สรุปโปรเจกต์ที่เลือก + ปิดโปรเจกต์ ════════ */}
      {project && (
        <div
          className={`${CARD} mt-4 flex flex-col gap-3 px-4 py-3 sm:px-[18px] md:flex-row md:items-center md:justify-between`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words text-[14px] font-bold">
              {project.name}
            </span>
            <StatusBadge completed={isCompleted} />
            {rows.length > 0 && (
              <span className="text-xs text-gray-500">
                Reviewed{" "}
                <strong
                  className={
                    reviewedCount === rows.length
                      ? "text-[#198754]"
                      : "text-gray-900"
                  }
                >
                  {reviewedCount}/{rows.length}
                </strong>
              </span>
            )}
          </div>
          {canManageReview && !isCompleted && (
            <button
              type="button"
              onClick={markCompleted}
              disabled={!canComplete}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-4 py-[9px] text-[13px] font-bold transition-all ${
                canComplete
                  ? "cursor-pointer border-[#198754] bg-[#198754] text-white shadow-[0_2px_5px_rgba(25,135,84,0.35)] hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(25,135,84,0.45)]"
                  : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
              }`}
            >
              {completing ? "กำลังปิดโปรเจกต์…" : "✔ Mark Project Completed"}
            </button>
          )}
        </div>
      )}

      {/* ════════ Workers + Review ════════ */}
      <div className={`${CARD} mt-4 overflow-hidden`}>
        {loading ? (
          emptyBox("Loading…")
        ) : !project ? (
          emptyBox("Select a project to review deployed workers.")
        ) : rows.length === 0 ? (
          emptyBox("No deployed workers for this project.")
        ) : (
          <>
            {/* ── ต่ำกว่า lg: การ์ด ── */}
            <div className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2 lg:hidden">
              {rows.map((r) => (
                <div
                  key={r.employeeId}
                  className={`rounded-lg border p-3 text-[13px] ${
                    r.dirty
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold">{r.fullName}</div>
                      <div className="text-[11px] text-gray-500">{r.empId}</div>
                    </div>
                    {renderSave(r)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {r.position}
                    {r.platform && ` · ${r.platform}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {ymd(r.mobDate)} → {ymd(r.demobDate)}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                    {renderStars(r)}
                    {renderRehire(r)}
                  </div>
                  <div className="mt-2">{renderComment(r)}</div>
                </div>
              ))}
            </div>

            {/* ── lg+: ตาราง ── */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Worker</th>
                    <th className={TH}>Position</th>
                    <th className={TH}>Platform</th>
                    <th className={TH}>MOB → D-MOB</th>
                    <th className={TH}>Rating</th>
                    <th className={TH}>Rehire?</th>
                    <th className={TH}>Comment</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.employeeId}
                      className={r.dirty ? "bg-blue-50/30" : ""}
                    >
                      <td className={TD}>
                        <div className="font-bold">{r.fullName}</div>
                        <div className="text-[11px] text-gray-500">
                          {r.empId}
                        </div>
                      </td>
                      <td className={TD}>{r.position}</td>
                      <td className={TD}>{r.platform || "—"}</td>
                      <td className={`${TD} whitespace-nowrap text-gray-500`}>
                        {ymd(r.mobDate)} → {ymd(r.demobDate)}
                      </td>
                      <td className={TD}>{renderStars(r)}</td>
                      <td className={TD}>{renderRehire(r)}</td>
                      <td className={TD}>{renderComment(r)}</td>
                      <td className={TD}>{renderSave(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
