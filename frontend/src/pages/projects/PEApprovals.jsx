import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// PE Approvals — คำขอใช้พนักงานที่ % Match ไม่ครบ 100% (ส่งมาจากหน้า Allocation)
// จัดกลุ่ม: โปรเจกต์ → ตำแหน่ง (position request) → รายคน
// อนุมัติ / ไม่อนุมัติ ยังเป็นรายคน
// ══════════════════════════════════════════════════════════

const TABS = [
  ["pending", "รออนุมัติ"],
  ["approved", "อนุมัติแล้ว"],
  ["rejected", "ไม่อนุมัติ"],
  ["all", "ทั้งหมด"],
];

const STATUS = {
  pending: ["⏳ รออนุมัติ", "bg-[#fff3cd] text-[#664d03]"],
  approved: ["✓ อนุมัติแล้ว", "bg-[#d1e7dd] text-[#0f5132]"],
  rejected: ["✕ ไม่อนุมัติ", "bg-[#f8d7da] text-[#842029]"],
};

const DECIDER_ROLES = ["project_engineer", "admin"];

const CARD = "rounded-[10px] border border-gray-200 bg-white";
const LABEL = "text-[11px] font-semibold text-gray-500";
const INPUT =
  "box-border w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400";
const BTN_OUTLINE =
  "cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const personName = (u) => (u ? `${u.titlePrefix ?? ""}${u.name ?? ""}` : "—");

const projectLabel = (p) =>
  p?.masterProjectRecord?.projectCode
    ? `[${p.masterProjectRecord.projectCode}] ${p.name}`
    : (p?.name ?? "—");

const matchColor = (pct) => (pct >= 70 ? "text-[#cc8400]" : "text-[#dc3545]");

// items มาจาก API เรียงใหม่สุดก่อนแล้ว → ลำดับกลุ่มตามคำขอล่าสุดของแต่ละกลุ่ม
function groupByProject(items) {
  const projects = new Map();
  for (const it of items) {
    const project = it.manpowerRequest?.project;
    const pid = project?.id ?? "unknown";
    if (!projects.has(pid)) {
      projects.set(pid, { project, requests: new Map(), count: 0 });
    }
    const g = projects.get(pid);
    g.count += 1;
    const rid = it.manpowerRequest?.id ?? "unknown";
    if (!g.requests.has(rid)) {
      g.requests.set(rid, { request: it.manpowerRequest, items: [] });
    }
    g.requests.get(rid).items.push(it);
  }
  return [...projects.entries()].map(([pid, g]) => ({
    pid,
    project: g.project,
    count: g.count,
    requests: [...g.requests.entries()].map(([rid, r]) => ({ rid, ...r })),
  }));
}

export default function PEApprovals() {
  const { backendUrl, userData } = useContext(AppContent);
  const canDecide = DECIDER_ROLES.includes(userData?.role?.name);

  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [decision, setDecision] = useState(null); // { item, action }
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/match-exceptions`, {
        withCredentials: true,
        params: { status: tab },
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, tab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && decision && !saving) setDecision(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decision, saving]);

  const groups = useMemo(() => groupByProject(items), [items]);

  const openDecision = (item, action) => {
    setNote("");
    setDecision({ item, action });
  };

  const submitDecision = async () => {
    if (!decision || saving) return;
    if (decision.action === "rejected" && !note.trim()) {
      alert("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }
    try {
      setSaving(true);
      await axios.put(
        `${backendUrl}/api/match-exceptions/${decision.item.id}/decision`,
        { decision: decision.action, note },
        { withCredentials: true },
      );
      setDecision(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "บันทึกไม่สำเร็จ");
      fetchItems(); // อาจมี PE คนอื่นพิจารณาไปแล้ว
    } finally {
      setSaving(false);
    }
  };

  const approving = decision?.action === "approved";

  // ── รายละเอียดรายคน ──
  const renderItem = (it) => {
    const [statusLabel, statusCls] = STATUS[it.status] ?? [
      it.status,
      "bg-gray-100 text-gray-500",
    ];
    const missing = Array.isArray(it.missingTrainings)
      ? it.missingTrainings
      : [];
    return (
      <div
        key={it.id}
        className="flex flex-col rounded-lg border border-gray-200 bg-white p-3.5"
      >
        {/* ชื่อ + % + สถานะ */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="break-words text-[14px] font-bold">
              {it.employee?.fullName}
            </div>
            <div className="text-[11px] text-gray-500">
              {it.employee?.empId || "—"} · #{it.employee?.empCode}
              {it.employee?.position?.name
                ? ` · ตำแหน่งปัจจุบัน ${it.employee.position.name}`
                : ""}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}
            >
              {statusLabel}
            </span>
            <span
              className={`text-[15px] font-bold ${matchColor(it.matchPct)}`}
            >
              {it.matchPct}%
            </span>
          </div>
        </div>

        {/* training ที่ขาด */}
        {missing.length > 0 && (
          <div className="mt-2.5">
            <div className={`${LABEL} mb-1`}>
              Training ที่ขาด ({missing.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-[#f5c6cb] bg-[#fff5f5] px-2 py-0.5 text-xs text-[#842029]"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* เหตุผลจาก MP */}
        <div className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2">
          <div className={LABEL}>
            เหตุผล · ขอโดย {personName(it.requestedBy)} ·{" "}
            {fmtDateTime(it.createdAt)}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap break-words text-[13px]">
            {it.reason}
          </div>
        </div>

        {/* ผลการพิจารณา */}
        {it.status !== "pending" && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 ${
              it.status === "approved" ? "bg-[#f0fff4]" : "bg-[#fff5f5]"
            }`}
          >
            <div className={LABEL}>
              พิจารณาโดย {personName(it.decidedBy)} ·{" "}
              {fmtDateTime(it.decidedAt)}
            </div>
            {it.decisionNote && (
              <div className="mt-0.5 whitespace-pre-wrap break-words text-[13px]">
                {it.decisionNote}
              </div>
            )}
          </div>
        )}

        {/* ปุ่ม (รายคน) */}
        {it.status === "pending" && canDecide && (
          <div className="mt-auto flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => openDecision(it, "rejected")}
              className="cursor-pointer rounded-lg border border-[#f5c6cb] bg-white px-4 py-2 text-[13px] font-semibold text-[#842029] hover:bg-[#fff5f5]"
            >
              ไม่อนุมัติ
            </button>
            <button
              type="button"
              onClick={() => openDecision(it, "approved")}
              className="cursor-pointer rounded-lg border-none bg-[#198754] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#157347]"
            >
              อนุมัติ
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div className={`${CARD} mb-4 px-4 py-4 sm:px-6`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-xl">✅</span>
          <span className="text-lg font-bold">PE Approvals</span>
          <span className="basis-full text-xs text-gray-500 md:basis-auto">
            คำขอใช้พนักงานที่ % Match ไม่ครบ 100% จากหน้า Allocation
          </span>
        </div>
        {!canDecide && (
          <div className="mt-2.5 rounded-lg border border-[#ffe69c] bg-[#fff8e1] px-3 py-2 text-xs text-[#664d03]">
            ดูสถานะได้อย่างเดียว — การอนุมัติทำได้เฉพาะ PE (Project Engineer)
          </div>
        )}
      </div>

      {/* ════════ Tabs ════════ */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b-2 border-gray-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-0.5 shrink-0 cursor-pointer whitespace-nowrap border-x-0 border-b-2 border-t-0 border-solid bg-transparent px-3 py-2.5 text-[13px] sm:px-[18px] ${
              tab === key
                ? "border-blue-600 font-bold text-blue-600"
                : "border-transparent font-medium text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            {tab === key && !loading && ` (${items.length})`}
          </button>
        ))}
      </div>

      {/* ════════ รายการ: โปรเจกต์ → ตำแหน่ง → รายคน ════════ */}
      {loading ? (
        <div className={`${CARD} p-10 text-center text-[13px] text-gray-500`}>
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className={`${CARD} p-10 text-center text-[13px] text-gray-500`}>
          {tab === "pending" ? "ไม่มีคำขอที่รออนุมัติ" : "ไม่มีรายการในหมวดนี้"}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.pid} className={`${CARD} overflow-hidden`}>
              {/* หัวโปรเจกต์ */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b6d4fe] border-l-4 border-l-blue-600 bg-[#d6e6fd] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <div className="break-words text-[15px] font-bold text-[#1e3a5f]">
                    {projectLabel(g.project)}
                  </div>
                  <div className="text-xs text-[#4a6380]">
                    {g.count} คำขอ
                    {g.requests.length > 1
                      ? ` · ${g.requests.length} ตำแหน่ง`
                      : ""}
                  </div>
                </div>
                {g.project?.id && (
                  <Link
                    to={`/allocation?projectId=${g.project.id}`}
                    className="shrink-0 rounded-md border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 no-underline hover:bg-blue-50"
                  >
                    เปิดโปรเจกต์ในหน้า Allocation →
                  </Link>
                )}
              </div>

              {/* แต่ละตำแหน่งในโปรเจกต์ */}
              <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
                {g.requests.map((r) => (
                  <div key={r.rid}>
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13px] font-bold">
                        {r.request?.position?.name ?? "—"}
                      </span>
                      <span className="text-xs text-gray-500">
                        ต้องการ {r.request?.quantity ?? "—"} คน · ขออนุมัติ{" "}
                        {r.items.length} คน
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {r.items.map(renderItem)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ ยืนยันการพิจารณา ════════ */}
      {decision && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-3 sm:p-5"
          onClick={() => !saving && setDecision(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[10px] bg-white supports-[height:100dvh]:max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`px-4 py-3.5 text-white sm:px-6 ${
                approving ? "bg-[#198754]" : "bg-[#842029]"
              }`}
            >
              <div className="text-[15px] font-bold">
                {approving ? "อนุมัติคำขอ" : "ไม่อนุมัติคำขอ"}
              </div>
              <div className="mt-0.5 text-xs opacity-90">
                {decision.item.employee?.fullName} ·{" "}
                {decision.item.manpowerRequest?.position?.name} ·{" "}
                {decision.item.matchPct}%
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                {approving ? "หมายเหตุ (ถ้ามี)" : "เหตุผลที่ไม่อนุมัติ *"}
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  approving
                    ? "เช่น ให้ HR จัดอบรมที่ขาดก่อนขึ้นงาน"
                    : "เช่น ขาด training ที่จำเป็นต่อความปลอดภัยของงานนี้"
                }
                className={`${INPUT} resize-y`}
              />
              {approving && (
                <div className="mt-2 text-[11px] text-gray-500">
                  อนุมัติแล้วพนักงานคนนี้จะเข้า Shortlist (Approved)
                  และไปที่หน้า Mobilization ทันที
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-4 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={saving}
                className={BTN_OUTLINE}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitDecision}
                disabled={saving || (!approving && !note.trim())}
                className={`cursor-pointer rounded-lg border-none px-5 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  approving
                    ? "bg-[#198754] hover:bg-[#157347]"
                    : "bg-[#842029] hover:bg-[#6a1a21]"
                }`}
              >
                {saving
                  ? "กำลังบันทึก..."
                  : approving
                    ? "ยืนยันอนุมัติ"
                    : "ยืนยันไม่อนุมัติ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
