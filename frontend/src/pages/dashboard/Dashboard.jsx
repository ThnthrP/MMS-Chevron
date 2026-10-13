import { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// Dashboard — หน้าแรกของทุก role (เดิมชื่อ AdminDashboard.jsx)
// ══════════════════════════════════════════════════════════

// recharts ต้องใช้ค่าสีจริง ไม่ใช่ class
const CERT = { valid: "#1d4ed8", expiring: "#eab308", expired: "#dc3545" };
const MOB = { pending: "#f5c518", ready: "#198754", on_site: "#0d6efd" };

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #dee2e6",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "6px 10px",
};

const CARD =
  "min-w-0 overflow-hidden rounded-[10px] border border-gray-200 bg-white";

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
const truncate = (str, max) =>
  !str ? "" : str.length > max ? `${str.slice(0, max - 1)}…` : str;

// YYYY-MM-DD ตามเวลาเครื่อง (เดิมใช้ toISOString = UTC วันอาจเลื่อน 1 วัน)
const ymd = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA");
};

// จอแคบ → ลดความกว้างแกนชื่อ cert ในกราฟ (260px กินที่เกินครึ่งบนมือถือ)
function useIsNarrow(query = "(max-width: 639px)") {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
function Kpi({ value, label, gradient, icon }) {
  return (
    <div
      className="relative min-h-[92px] overflow-hidden rounded-xl px-4 py-4 text-white sm:px-5"
      style={{ background: gradient }}
    >
      <div className="text-[26px] font-extrabold leading-none sm:text-[30px]">
        {value}
      </div>
      <div className="mt-1.5 text-xs opacity-90 sm:text-[13px]">{label}</div>
      <span className="absolute right-3 top-3 text-[28px] opacity-25 sm:right-3.5 sm:top-3.5 sm:text-[34px]">
        {icon}
      </span>
    </div>
  );
}

function Card({ title, right, children }) {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3.5 text-[15px] font-bold sm:px-[18px]">
        <span>{title}</span>
        {right}
      </div>
      <div className="p-4 sm:p-[18px]">{children}</div>
    </div>
  );
}

function BucketChip({ expired, children }) {
  return (
    <span
      className={`whitespace-nowrap rounded px-2 py-px text-[10px] font-bold ${
        expired ? "bg-[#dc3545] text-white" : "bg-[#eab308] text-[#664d03]"
      }`}
    >
      {children}
    </span>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAlertGroup, setSelectedAlertGroup] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const alertReqRef = useRef(0);

  const isNarrow = useIsNarrow();

  // initial = โหลดครั้งแรก (แสดง Loading ทั้งหน้า)
  // refresh = กดปุ่ม ↻ (ข้อมูลเดิมค้างไว้ แค่ปุ่มหมุน — เดิมทั้งหน้ากะพริบเป็น Loading)
  const load = async ({ initial = false } = {}) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      const res = await axios.get(`${backendUrl}/api/dashboard`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  // ── modal: ล็อก scroll + กด Esc ปิด ──
  useEffect(() => {
    if (!selectedAlertGroup) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && closeAlertGroup();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!selectedAlertGroup]);

  // เปิด modal + โหลดรายชื่อเต็ม (data.alerts ถูก cap โดย backend)
  // requestId — เปิด A แล้วรีบปิดไปเปิด B รายชื่อของ A ต้องไม่มาทับ B
  const openAlertGroup = async (g) => {
    const reqId = ++alertReqRef.current;
    setSelectedAlertGroup(g);
    setModalLoading(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/dashboard/alerts/${encodeURIComponent(g.training)}`,
        { withCredentials: true },
      );
      if (reqId !== alertReqRef.current) return;
      setSelectedAlertGroup((prev) =>
        prev && prev.training === g.training
          ? { ...prev, items: res.data }
          : prev,
      );
    } catch (err) {
      console.error(err);
    } finally {
      if (reqId === alertReqRef.current) setModalLoading(false);
    }
  };

  const closeAlertGroup = () => {
    alertReqRef.current++; // ยกเลิกผลที่กำลังรอ
    setSelectedAlertGroup(null);
    setModalLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="p-10 text-center text-gray-500">
        {loading ? "Loading…" : "No data."}
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const mobData = [
    { name: "Pending", value: data.mobilization.pending, color: MOB.pending },
    { name: "Ready", value: data.mobilization.ready, color: MOB.ready },
    { name: "On-Site", value: data.mobilization.on_site, color: MOB.on_site },
  ];
  const mobTotal = mobData.reduce((n, s) => n + (s.value || 0), 0);

  const availTotal =
    data.availability.available + data.availability.unavailable || 1;

  // ── group alerts ตาม training → { training, expiredCount, expiringCount, items[] } ──
  const alertGroups = (() => {
    // certByType = แหล่งความจริงของ "จำนวนรวม" (ไม่ถูก cap)
    const certTypeMap = new Map(data.certByType.map((c) => [c.name, c]));
    // data.alerts ถูก cap — ใช้เป็น placeholder ก่อนโหลดรายชื่อเต็มตอนเปิด modal
    const itemMap = new Map();
    for (const a of data.alerts) {
      const key = a.training || "Unknown";
      if (!itemMap.has(key)) itemMap.set(key, []);
      itemMap.get(key).push(a);
    }
    return [...new Set([...certTypeMap.keys(), ...itemMap.keys()])]
      .map((key) => {
        const certType = certTypeMap.get(key);
        const items = itemMap.get(key) || [];
        return {
          training: key,
          expiredCount:
            certType?.expired ??
            items.filter((a) => a.bucket === "expired").length,
          expiringCount:
            certType?.expiring ??
            items.filter((a) => a.bucket !== "expired").length,
          items,
        };
      })
      .filter((g) => g.expiredCount > 0 || g.expiringCount > 0)
      .sort(
        (a, b) =>
          b.expiredCount + b.expiringCount - (a.expiredCount + a.expiringCount),
      );
  })();

  // รายชื่อใน modal — Expired ก่อน แล้วเรียงตามวันหมดอายุที่ใกล้สุด
  const modalItems = [...(selectedAlertGroup?.items || [])].sort((a, b) => {
    const ea = a.bucket === "expired" ? 0 : 1;
    const eb = b.bucket === "expired" ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
  });

  const yAxisWidth = isNarrow ? 120 : 260;
  const tickMax = isNarrow ? 16 : 34;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1800px] flex-col gap-4">
      {/* ════════ Header ════════ */}
      <div
        className={`${CARD} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-[18px]`}
      >
        <div>
          <div className="text-lg font-extrabold sm:text-xl">
            🛠 Dashboard — Monitoring &amp; Compliance
          </div>
          <div className="mt-1 text-xs text-gray-500">{today}</div>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="shrink-0 cursor-pointer self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>
            ↻
          </span>{" "}
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ════════ KPI ════════ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi
          value={data.totalWorkers}
          label="Total Workers"
          icon="👥"
          gradient="linear-gradient(135deg,#3b6ea5,#1e3a5f)"
        />
        <Kpi
          value={data.counts.ready}
          label="Ready for Deployment"
          icon="✅"
          gradient="linear-gradient(135deg,#2fb380,#157347)"
        />
        <Kpi
          value={data.counts.onSite}
          label="Currently On-Site"
          icon="📍"
          gradient="linear-gradient(135deg,#4d8bf0,#2c5fc4)"
        />
        <Kpi
          value={data.counts.certAlerts}
          label="Cert Alerts (<60 days)"
          icon="⚠"
          gradient="linear-gradient(135deg,#f0883e,#dc5b2c)"
        />
      </div>

      {/* ════════ Worker status + Cert by type ════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card title="Worker Status (Mobilization)">
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={mobData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={1}
                  stroke="none"
                >
                  {mobData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                {/* legend แสดงจำนวนด้วย — ชิ้น On-Site (1 คน) เล็กจนมองไม่เห็นในวง */}
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value, entry) =>
                    `${value} (${entry.payload.value})`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-2xl font-extrabold text-gray-900">
                {mobTotal}
              </div>
              <div className="text-[11px] text-gray-500">workers</div>
            </div>
          </div>

          {/* Availability mini-bar */}
          <div className="mt-2 border-t border-gray-100 pt-3">
            <div className="mb-2 text-xs font-bold text-gray-500">
              AVAILABILITY
            </div>
            {[
              ["Available", data.availability.available, "bg-[#198754]"],
              ["Unavailable", data.availability.unavailable, "bg-[#dc3545]"],
            ].map(([label, val, bar]) => (
              <div key={label} className="mb-2">
                <div className="mb-[3px] flex justify-between text-xs">
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
                <div className="h-1.5 rounded bg-[#eef0f2]">
                  <div
                    className={`h-1.5 rounded ${bar}`}
                    style={{
                      width: `${Math.round((val / availTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Certification Compliance by Type">
          {data.certByType.length ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(300, data.certByType.length * 34)}
            >
              <BarChart
                data={data.certByType}
                layout="vertical"
                margin={{
                  top: 8,
                  right: isNarrow ? 8 : 24,
                  left: 0,
                  bottom: 8,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef0f2"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#adb5bd" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={11}
                      fill="#495057"
                    >
                      <title>{payload.value}</title>
                      {truncate(payload.value, tickMax)}
                    </text>
                  )}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#f1f3f5" }}
                />
                <Legend
                  iconType="circle"
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: "12px", paddingBottom: "8px" }}
                />
                <Bar
                  dataKey="valid"
                  stackId="a"
                  name="Valid"
                  fill={CERT.valid}
                />
                <Bar
                  dataKey="expiring"
                  stackId="a"
                  name="Expiring"
                  fill={CERT.expiring}
                />
                <Bar
                  dataKey="expired"
                  stackId="a"
                  name="Expired"
                  fill={CERT.expired}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-[13px] text-gray-500">
              No certification data
            </div>
          )}
        </Card>
      </div>

      {/* ════════ Alerts ════════ */}
      <Card
        title="🔔 Auto-Scan Alerts — Expiring Certifications"
        right={
          <span className="shrink-0 text-xs font-normal text-gray-500">
            {alertGroups.length} cert types
          </span>
        }
      >
        {alertGroups.length === 0 ? (
          <div className="text-[13px] font-semibold text-[#198754]">
            ✅ No expiring or expired certifications
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {alertGroups.map((g) => {
              const total = g.expiredCount + g.expiringCount;
              const hasExpired = g.expiredCount > 0;
              return (
                <button
                  key={g.training}
                  type="button"
                  onClick={() => openAlertGroup(g)}
                  className={`flex cursor-pointer flex-col gap-2 rounded-[10px] border px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${
                    hasExpired
                      ? "border-[#f5c6cb] bg-[#fdf2f2]"
                      : "border-[#ffe69c] bg-[#fffaf0]"
                  }`}
                >
                  <div
                    className="text-[13px] font-bold leading-snug text-gray-900"
                    title={g.training}
                  >
                    {g.training}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[26px] font-extrabold ${
                        hasExpired ? "text-[#dc3545]" : "text-[#8a6d00]"
                      }`}
                    >
                      {total}
                    </span>
                    <span className="text-xs text-gray-500">
                      alert{total > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.expiredCount > 0 && (
                      <BucketChip expired>{g.expiredCount} Expired</BucketChip>
                    )}
                    {g.expiringCount > 0 && (
                      <BucketChip>{g.expiringCount} Expiring</BucketChip>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ════════ Alert modal ════════ */}
      {selectedAlertGroup && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-3 sm:p-5"
          onClick={closeAlertGroup}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[10px] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 bg-[#1e3a5f] px-5 py-3.5 text-white">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">
                  🔔 {selectedAlertGroup.training}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedAlertGroup.expiredCount > 0 && (
                    <BucketChip expired>
                      {selectedAlertGroup.expiredCount} Expired
                    </BucketChip>
                  )}
                  {selectedAlertGroup.expiringCount > 0 && (
                    <BucketChip>
                      {selectedAlertGroup.expiringCount} Expiring
                    </BucketChip>
                  )}
                </div>
              </div>
              <button
                onClick={closeAlertGroup}
                className="shrink-0 cursor-pointer border-none bg-transparent text-xl leading-none text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {modalLoading ? (
                <div className="p-5 text-center text-[13px] text-gray-500">
                  กำลังโหลดรายชื่อ...
                </div>
              ) : modalItems.length === 0 ? (
                <div className="p-5 text-center text-[13px] text-gray-500">
                  ไม่พบรายชื่อ
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {modalItems.map((a, i) => {
                    const isExpired = a.bucket === "expired";
                    return (
                      <div
                        key={i}
                        className={`flex flex-col gap-1.5 rounded-md border-l-[3px] px-3.5 py-2.5 ${
                          isExpired
                            ? "border-[#dc3545] bg-[#fdf2f2]"
                            : "border-[#eab308] bg-[#fffaf0]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[13px] font-bold">
                              {a.fullName}
                            </span>
                            {a.position && (
                              <span className="text-xs text-gray-500">
                                {a.position}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 uppercase">
                            <BucketChip expired={isExpired}>
                              {isExpired ? "Expired" : "Expiring"}
                            </BucketChip>
                          </span>
                        </div>
                        <span className="text-right text-xs text-gray-500">
                          Expires: {ymd(a.expiryDate)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
              <span className="text-xs text-gray-500">
                {!modalLoading && `${modalItems.length} คน`}
              </span>
              <button
                onClick={closeAlertGroup}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2 text-[13px] hover:bg-gray-50"
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
