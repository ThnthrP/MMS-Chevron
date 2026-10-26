import { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// Audit Log — ใครทำอะไร เมื่อไร (admin only)
// ข้อมูลมาจาก middleware/auditTrail.js ฝั่ง backend (บันทึกอัตโนมัติ)
// ══════════════════════════════════════════════════════════

const FIELD_LABEL =
  "mb-1 block text-xs font-semibold uppercase tracking-[0.4px] text-gray-500";
const INPUT =
  "box-border w-full rounded-lg border border-gray-300 bg-white px-3 py-[8px] text-[13px] outline-none focus:border-blue-400";
const TH =
  "whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.3px] text-gray-500";
const TD = "border-b border-gray-100 px-3.5 py-2.5 align-top text-[13px]";
const BTN_GHOST =
  "cursor-pointer whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-[7px] text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

// ── ป้ายชื่อ ──
const ACTION_META = {
  CREATE: { label: "เพิ่ม", tone: "bg-green-50 text-green-700 border-green-200" },
  UPDATE: { label: "แก้ไข", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETE: { label: "ลบ", tone: "bg-red-50 text-red-700 border-red-200" },
  LOGIN: { label: "เข้าสู่ระบบ", tone: "bg-slate-50 text-slate-600 border-slate-200" },
  LOGOUT: { label: "ออกจากระบบ", tone: "bg-slate-50 text-slate-500 border-slate-200" },
  LOGIN_FAILED: { label: "Login ไม่ผ่าน", tone: "bg-red-50 text-red-700 border-red-200" },
  APPROVE: { label: "อนุมัติ", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECT: { label: "ไม่อนุมัติ", tone: "bg-orange-50 text-orange-700 border-orange-200" },
  REVOKE: { label: "ยกเลิกอนุมัติ", tone: "bg-orange-50 text-orange-700 border-orange-200" },
  DECISION: { label: "ตัดสินผล", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  IMPORT: { label: "นำเข้า/กลุ่ม", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  UPLOAD: { label: "อัปโหลด", tone: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  EXPORT: { label: "ส่งออก", tone: "bg-gray-50 text-gray-600 border-gray-200" },
  CREDENTIAL: { label: "รหัสผ่าน/PIN", tone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
};
const actionMeta = (a) =>
  ACTION_META[a] || { label: a, tone: "bg-gray-50 text-gray-600 border-gray-200" };

const MODULE_LABEL = {
  auth: "Login / Logout",
  users: "User Management",
  workers: "Workers",
  training_matrix: "Training Matrix",
  positions: "Positions",
  trainings: "Trainings",
  compliance: "Compliance",
  projects: "Projects",
  clients: "Clients",
  allocation: "Allocation",
  pe_approvals: "PE Approvals",
  mobilization: "Mobilization",
  review: "Post-Project Review",
  reports: "Reports",
  dashboard: "Dashboard",
  divisions: "Departments",
  notifications: "Notifications",
  training_requests: "Training Requests",
  medical_requests: "Medical Requests",
  supervisor: "Supervisor",
  project_messages: "Project Messages",
  leave_requests: "Leave Requests",
  worker_app: "Worker App",
};
const moduleLabel = (m) => MODULE_LABEL[m] || m;

// ลิงก์ไปหน้าของสิ่งที่ถูกกระทำ (คลิกขวาเปิดแท็บใหม่ได้)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function resourceHref(log) {
  if (!log.resourceId || !UUID_RE.test(log.resourceId) || log.action === "DELETE") return null;
  const p = log.path || "";
  if (/^\/api\/(workers|employees)\//.test(p)) return `/workers/${log.resourceId}`;
  if (/^\/api\/projects\//.test(p)) return `/projects/${log.resourceId}`;
  if (/^\/api\/training-requests\//.test(p)) return `/training-requests/${log.resourceId}`;
  if (/^\/api\/medical-requests\//.test(p)) return `/medical-requests/${log.resourceId}`;
  return null;
}

// ── วันที่ (เวลาไทย) ──
const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYmd(d);
};
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const QUICK_RANGES = [
  { key: "today", label: "วันนี้", from: () => daysAgo(0) },
  { key: "7d", label: "7 วัน", from: () => daysAgo(6) },
  { key: "30d", label: "30 วัน", from: () => daysAgo(29) },
  { key: "90d", label: "90 วัน", from: () => daysAgo(89) },
];

const EMPTY_FILTERS = {
  search: "",
  userId: "",
  actorType: "",
  module: "",
  action: "",
  success: "",
  from: daysAgo(6),
  to: daysAgo(0),
};

const PAGE_SIZE = 50;

// ══════════════════════════════════════════════════════════
// Detail drawer
// ══════════════════════════════════════════════════════════
function JsonBlock({ value }) {
  return (
    <pre className="m-0 max-h-[320px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-[11.5px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

const showVal = (v) =>
  v === null || v === undefined || v === "" ? (
    <span className="italic text-gray-400">(ว่าง)</span>
  ) : (
    String(v)
  );

function DetailDrawer({ id, onClose, backendUrl }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios
      .get(`${backendUrl}/api/audit-logs/${id}`, { withCredentials: true })
      .then(({ data }) => (data.success ? setLog(data.log) : toast.error(data.message)))
      .catch((e) => toast.error(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [id, backendUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = log?.details || {};
  const changes = d.changes ? Object.entries(d.changes) : [];
  const href = log ? resourceHref(log) : null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
          <span className="text-[15px] font-bold">รายละเอียดการใช้งาน</span>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-xl leading-none text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading || !log ? (
            <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด…</div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* สรุป */}
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${actionMeta(log.action).tone}`}
                  >
                    {actionMeta(log.action).label}
                  </span>
                  <span className="text-xs text-gray-500">{moduleLabel(log.module)}</span>
                  {!log.success && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      ไม่สำเร็จ
                    </span>
                  )}
                </div>
                <div className="text-[15px] font-semibold text-gray-800">{log.summary || "—"}</div>
                {d.message && <div className="mt-1 text-xs text-gray-500">ระบบตอบ: {d.message}</div>}
                {href && (
                  <Link to={href} className="mt-2 inline-block text-xs font-semibold text-blue-600">
                    เปิดหน้าที่เกี่ยวข้อง ›
                  </Link>
                )}
              </div>

              {/* ใคร / เมื่อไร / จากไหน */}
              <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 rounded-lg border border-gray-200 p-3.5 text-[13px]">
                <span className="text-gray-500">เวลา</span>
                <span>{fmtDateTime(log.createdAt)}</span>
                <span className="text-gray-500">ผู้ใช้</span>
                <span className="font-semibold">{log.actorName || "—"}</span>
                <span className="text-gray-500">Role</span>
                <span>{log.actorRole || (log.actorType === "anonymous" ? "ไม่ได้ล็อกอิน" : "—")}</span>
                <span className="text-gray-500">ช่องทาง</span>
                <span>{log.actorType === "worker" ? "Worker App" : log.actorType === "user" ? "MMS (หลังบ้าน)" : "—"}</span>
                <span className="text-gray-500">IP</span>
                <span className="font-mono text-xs">{log.ip || "—"}</span>
                <span className="text-gray-500">อุปกรณ์</span>
                <span className="break-all text-xs text-gray-600">{log.userAgent || "—"}</span>
                <span className="text-gray-500">Request</span>
                <span className="break-all font-mono text-xs">
                  {log.method} {log.path} → {log.statusCode}
                </span>
                {log.resourceId && (
                  <>
                    <span className="text-gray-500">Resource ID</span>
                    <span className="break-all font-mono text-xs">{log.resourceId}</span>
                  </>
                )}
              </div>

              {/* ก่อน → หลัง */}
              {changes.length > 0 && (
                <div>
                  <div className={FIELD_LABEL}>สิ่งที่เปลี่ยน ({changes.length})</div>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-[12.5px]">
                      <thead>
                        <tr>
                          <th className={TH}>Field</th>
                          <th className={TH}>ก่อน</th>
                          <th className={TH}>หลัง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map(([field, c]) => (
                          <tr key={field}>
                            <td className={`${TD} font-mono text-xs`}>{field}</td>
                            <td className={`${TD} break-all bg-red-50/50 text-red-700`}>{showVal(c.from)}</td>
                            <td className={`${TD} break-all bg-green-50/50 text-green-700`}>{showVal(c.to)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {d.files && (
                <div>
                  <div className={FIELD_LABEL}>ไฟล์ที่อัปโหลด</div>
                  <ul className="m-0 list-disc pl-5 text-[13px]">
                    {d.files.map((f, i) => (
                      <li key={i}>
                        {f.name} <span className="text-xs text-gray-400">({Math.round((f.size || 0) / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.body && (
                <div>
                  <div className={FIELD_LABEL}>ข้อมูลที่ส่งมา (ตัดรหัสผ่าน/PIN ออกแล้ว)</div>
                  <JsonBlock value={d.body} />
                </div>
              )}
              {d.query && (
                <div>
                  <div className={FIELD_LABEL}>Query</div>
                  <JsonBlock value={d.query} />
                </div>
              )}
              {d.extra && (
                <div>
                  <div className={FIELD_LABEL}>ข้อมูลเพิ่มเติม</div>
                  <JsonBlock value={d.extra} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════
export default function AuditLogs() {
  const { backendUrl } = useContext(AppContent);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [options, setOptions] = useState({ users: [], modules: [], actions: [] });
  const [detailId, setDetailId] = useState(null);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  // พิมพ์ค้นหา → รอ 400ms ค่อยยิง
  useEffect(() => {
    const t = setTimeout(() => setFilter("search", searchDraft), 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const queryParams = useCallback(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) p[k] = v;
    });
    return p;
  }, [filters]);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/audit-logs/filters`, { withCredentials: true })
      .then(({ data }) => data.success && setOptions(data))
      .catch(() => {});
  }, [backendUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${backendUrl}/api/audit-logs`, {
        params: { ...queryParams(), page, pageSize: PAGE_SIZE },
        withCredentials: true,
      })
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.success) return toast.error(data.message);
        setRows(data.rows);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.totalPages));
      })
      .catch((e) => !cancelled && toast.error(e.response?.data?.message || e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [backendUrl, queryParams, page]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${backendUrl}/api/audit-logs/export`, {
        params: queryParams(),
        withCredentials: true,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log_${filters.from || "all"}_${filters.to || "now"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const activeRange = QUICK_RANGES.find(
    (r) => filters.from === r.from() && filters.to === daysAgo(0),
  )?.key;

  const hasExtraFilters =
    filters.search || filters.userId || filters.actorType || filters.module || filters.action || filters.success;

  const resetFilters = () => {
    setSearchDraft("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  // แทรกหัวคั่นวัน ในตาราง
  let lastDay = null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-bold">Audit Log</h1>
          <div className="text-xs text-gray-500">
            บันทึกการใช้งานระบบ · ใครทำอะไร เมื่อไร (เพิ่ม / แก้ไข / ลบ / อนุมัติ / เข้า-ออกระบบ) · คลิกแถวเพื่อดูรายละเอียด
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || total === 0}
          className="w-full shrink-0 cursor-pointer whitespace-nowrap rounded-md border-none bg-[#2B2F78] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#22265f] disabled:cursor-default disabled:bg-gray-400 sm:w-auto"
        >
          {exporting ? "กำลังส่งออก…" : "⬇ Export CSV"}
        </button>
      </div>

      {/* ════════ Filters — คั่นด้วยเส้น ════════ */}
      <div className="border-y border-gray-200 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.4px] text-gray-500">
            ช่วงเวลา
          </span>
          {QUICK_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setFilters((f) => ({ ...f, from: r.from(), to: daysAgo(0) }));
                setPage(1);
              }}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
                activeRange === r.key
                  ? "border-[#2B2F78] bg-[#2B2F78] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
          <span className="mx-1 text-gray-300">|</span>
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilter("from", e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
          <span className="text-xs text-gray-400">ถึง</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilter("to", e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className={FIELD_LABEL}>ค้นหา</label>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="ชื่อผู้ใช้ / รายละเอียด / path / IP"
              className={INPUT}
            />
          </div>
          <div>
            <label className={FIELD_LABEL}>ผู้ใช้</label>
            <select value={filters.userId} onChange={(e) => setFilter("userId", e.target.value)} className={INPUT}>
              <option value="">ทั้งหมด</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `(${u.role})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FIELD_LABEL}>เมนู / ส่วนงาน</label>
            <select value={filters.module} onChange={(e) => setFilter("module", e.target.value)} className={INPUT}>
              <option value="">ทั้งหมด</option>
              {options.modules.map((m) => (
                <option key={m} value={m}>
                  {moduleLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FIELD_LABEL}>การกระทำ</label>
            <select value={filters.action} onChange={(e) => setFilter("action", e.target.value)} className={INPUT}>
              <option value="">ทั้งหมด</option>
              {options.actions.map((a) => (
                <option key={a} value={a}>
                  {actionMeta(a).label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={FIELD_LABEL}>ช่องทาง</label>
              <select
                value={filters.actorType}
                onChange={(e) => setFilter("actorType", e.target.value)}
                className={INPUT}
              >
                <option value="">ทั้งหมด</option>
                <option value="user">MMS</option>
                <option value="worker">Worker App</option>
                <option value="anonymous">ไม่ได้ล็อกอิน</option>
              </select>
            </div>
            <div>
              <label className={FIELD_LABEL}>ผล</label>
              <select value={filters.success} onChange={(e) => setFilter("success", e.target.value)} className={INPUT}>
                <option value="">ทั้งหมด</option>
                <option value="true">สำเร็จ</option>
                <option value="false">ไม่สำเร็จ</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* จำนวน + ล้างตัวกรอง */}
      <div className="flex items-center gap-3 py-2 text-xs text-gray-500">
        <span>
          พบ <b className="text-gray-800">{total.toLocaleString()}</b> รายการ
        </span>
        {hasExtraFilters && (
          <button
            onClick={resetFilters}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-[#dc3545] hover:underline"
          >
            ✕ ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* ════════ Table (desktop) ════════ */}
      <div className="hidden border-y border-gray-200 md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${TH} w-[90px]`}>เวลา</th>
                <th className={TH}>ผู้ใช้</th>
                <th className={TH}>การกระทำ</th>
                <th className={TH}>เมนู</th>
                <th className={`${TH} w-[45%]`}>รายละเอียด</th>
                <th className={TH}>IP</th>
              </tr>
            </thead>
            <tbody className={`[&>tr:last-child>td]:border-b-0 ${loading ? "opacity-50" : ""}`}>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    ไม่มีรายการในช่วงที่เลือก
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const day = fmtDay(r.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;
                const am = actionMeta(r.action);
                return [
                  showDay && (
                    <tr key={`d-${r.id}`}>
                      <td colSpan={6} className="border-b border-gray-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-500">
                        {day}
                      </td>
                    </tr>
                  ),
                  <tr
                    key={r.id}
                    onClick={() => setDetailId(r.id)}
                    className={`cursor-pointer hover:bg-blue-50/40 ${!r.success ? "bg-red-50/40" : ""}`}
                  >
                    <td className={`${TD} whitespace-nowrap font-mono text-xs text-gray-600`}>
                      {fmtTime(r.createdAt)}
                    </td>
                    <td className={TD}>
                      <button
                        type="button"
                        title="ดูเฉพาะของผู้ใช้นี้"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.userId) setFilter("userId", r.userId);
                        }}
                        className="cursor-pointer border-none bg-transparent p-0 text-left text-[13px] font-semibold text-gray-800 hover:text-[#2B2F78] hover:underline"
                      >
                        {r.actorName || "—"}
                      </button>
                      <div className="text-[11px] text-gray-400">
                        {r.actorType === "worker" ? "📱 Worker App" : r.actorRole || (r.actorType === "anonymous" ? "ไม่ได้ล็อกอิน" : "")}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${am.tone}`}>
                        {am.label}
                      </span>
                      {!r.success && (
                        <div className="mt-1 text-[11px] font-semibold text-red-600">✕ ไม่สำเร็จ ({r.statusCode})</div>
                      )}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-gray-600`}>{moduleLabel(r.module)}</td>
                    <td className={TD}>
                      <div className="text-gray-800">{r.summary || "—"}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-gray-400" title={`${r.method} ${r.path}`}>
                        {r.method} {r.path}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-[11px] text-gray-500`}>{r.ip || "—"}</td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ รายการ (mobile) — คั่นด้วยเส้น ════════ */}
      <div className="divide-y divide-gray-200 border-y border-gray-200 md:hidden">
        {rows.length === 0 && !loading && (
          <div className="py-10 text-center text-sm text-gray-400">ไม่มีรายการในช่วงที่เลือก</div>
        )}
        {rows.map((r) => {
          const am = actionMeta(r.action);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setDetailId(r.id)}
              className={`block w-full cursor-pointer border-none px-1 py-3 text-left ${!r.success ? "bg-red-50/40" : "bg-transparent"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${am.tone}`}>{am.label}</span>
                <span className="font-mono text-[11px] text-gray-500">{fmtDateTime(r.createdAt)}</span>
              </div>
              <div className="text-[13px] font-semibold text-gray-800">{r.summary || "—"}</div>
              <div className="mt-1 text-[11px] text-gray-500">
                {r.actorName || "—"} · {moduleLabel(r.module)}
                {!r.success && <span className="ml-1 font-semibold text-red-600">· ไม่สำเร็จ</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* ════════ Pagination ════════ */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <button className={BTN_GHOST} disabled={page <= 1 || loading} onClick={() => setPage(1)}>
            «
          </button>
          <button className={BTN_GHOST} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ‹ ก่อนหน้า
          </button>
          <span className="px-2 text-gray-600">
            หน้า <b>{page}</b> / {totalPages}
          </span>
          <button className={BTN_GHOST} disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            ถัดไป ›
          </button>
          <button className={BTN_GHOST} disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>
            »
          </button>
        </div>
      )}

      {detailId && <DetailDrawer id={detailId} backendUrl={backendUrl} onClose={() => setDetailId(null)} />}
    </div>
  );
}
