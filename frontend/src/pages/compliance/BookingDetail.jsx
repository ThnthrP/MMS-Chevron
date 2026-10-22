import { useState, useEffect, useContext, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// รายละเอียดคำขอจอง — ใช้ทั้ง Training (/training-requests/:id) และ Medical (/medical-requests/:id)
// HR ยืนยัน / ปฏิเสธ รายคน ด้วยการ์ด "HR confirmation" (แบบโปรแกรมตัวอย่าง)
//   ยืนยัน → ใส่วันที่ที่ศูนย์อบรม / โรงพยาบาลให้จริง + สถานที่ + หมายเหตุ
//   ปฏิเสธ → ใส่เหตุผล
// ผู้ขอได้รับแจ้งเตือนทุกครั้งที่ HR ตัดสิน · ไม่เหลือคนรอ → คำขอปิดอัตโนมัติ
// ══════════════════════════════════════════════════════════

const TH = "whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold text-gray-500";
const TD = "px-3 py-2.5 align-top text-[13px]";
const BTN =
  "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const INPUT =
  "box-border h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-blue-500";

const STATUS = {
  pending: ["⏳ รอ HR", "bg-[#fff3cd] text-[#664d03]"],
  confirmed: ["✓ ยืนยันแล้ว", "bg-[#d1e7dd] text-[#0f5132]"],
  rejected: ["✕ ปฏิเสธ", "bg-[#f8d7da] text-[#842029]"],
};
const REASON = {
  overdue: "❌ หมดอายุ",
  no_record: "⚪ ไม่มีข้อมูล",
  due_soon: "⏰ ใกล้หมดอายุ",
  manual: "📝 ขอเอง",
};

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
const fmtRange = (a, b) => (a ? `${fmtDay(a)}${b && fmtDay(b) !== fmtDay(a) ? ` – ${fmtDay(b)}` : ""}` : "");
const fmtDateTime = (d) =>
  new Date(d).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

// ── การ์ด HR confirmation ──
function DecisionModal({ isTraining, rows, batch, initialDecision, onClose, onSave, saving }) {
  const first = rows[0];
  const [decision, setDecision] = useState(initialDecision || "confirmed");
  const [start, setStart] = useState(toYMD(first?.confirmedStart || batch.requestedStart));
  const [end, setEnd] = useState(toYMD(first?.confirmedEnd || batch.requestedEnd || batch.requestedStart));
  const [provider, setProvider] = useState(first?.confirmedProvider || batch.provider || "");
  const [note, setNote] = useState(rows.length === 1 ? first?.hrNote || "" : "");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const dateError = start && end && end < start ? "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม" : "";
  const ready = !saving && (decision === "rejected" || !dateError);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <span className="text-[15px] font-bold">HR confirmation — {rows.length} คน</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-lg leading-none text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-3 max-h-[120px] overflow-y-auto rounded-md border border-gray-200">
            {rows.map((r) => (
              <div key={r.itemId} className="border-b border-gray-100 px-3 py-1.5 text-xs last:border-b-0">
                <b className="text-[13px]">{r.fullName}</b>{" "}
                <span className="text-gray-500">{r.position || ""}</span>
                <div className="text-gray-500">
                  {isTraining ? r.trainingName : r.checkType}
                  {fmtRange(batch.requestedStart, batch.requestedEnd) &&
                    ` · ขอ ${fmtRange(batch.requestedStart, batch.requestedEnd)}`}
                  {batch.provider && ` · ${batch.provider}`}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
            {[
              ["confirmed", isTraining ? "✓ ยืนยัน — ศูนย์อบรมรับแล้ว" : "✓ ยืนยันวันนัด"],
              ["rejected", "✕ ปฏิเสธ"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setDecision(k)}
                className={`cursor-pointer rounded-md border-none px-2 py-2 text-xs font-semibold ${
                  decision === k
                    ? k === "confirmed"
                      ? "bg-white text-[#198754] shadow"
                      : "bg-white text-[#dc3545] shadow"
                    : "bg-transparent text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {decision === "confirmed" && (
            <>
              <div className="mb-1 text-[11px] text-gray-500">
                วันที่ยืนยันแล้ว — แก้ได้ถ้า{isTraining ? "ศูนย์อบรม" : "โรงพยาบาล"}ให้วันอื่น
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                    {isTraining ? "วันเริ่มอบรม" : "วันนัดตรวจ"}
                  </label>
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">ถึง</label>
                  <input
                    type="date"
                    value={end}
                    min={start || undefined}
                    onChange={(e) => setEnd(e.target.value)}
                    className={`${INPUT} ${dateError ? "border-red-400" : ""}`}
                  />
                </div>
              </div>
              {dateError && <div className="-mt-2 mb-2 text-[11px] text-red-600">{dateError}</div>}
              <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                {isTraining ? "ศูนย์อบรม / สถานที่" : "โรงพยาบาล / คลินิก"}
              </label>
              <input value={provider} onChange={(e) => setProvider(e.target.value)} className={`${INPUT} mb-3`} />
            </>
          )}
          <label className="mb-1 block text-[11px] font-semibold text-gray-600">
            {decision === "rejected" ? "เหตุผล (แจ้งผู้ขอ)" : "หมายเหตุถึงผู้ขอ"}
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              decision === "rejected"
                ? "เช่น รอบนี้เต็ม รอรอบเดือนหน้า"
                : "เช่น ได้ที่นั่งแล้ว รายงานตัว 07:30"
            }
            className={INPUT}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-md border border-gray-200 bg-white px-4 py-2 text-[13px] hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              onSave({
                decision,
                confirmedStart: start || null,
                confirmedEnd: end || start || null,
                provider,
                note,
              })
            }
            className={`cursor-pointer rounded-md border-none px-5 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${
              decision === "rejected" ? "bg-[#dc3545] hover:bg-[#bb2d3b]" : "bg-[#198754] hover:bg-[#157347]"
            }`}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetail({ type = "training" }) {
  const isTraining = type === "training";
  const { id } = useParams();
  const { backendUrl } = useContext(AppContent);
  const apiBase = `${backendUrl}/api/${isTraining ? "training-requests" : "medical-requests"}`;
  const listPath = isTraining ? "/requests-history" : "/medical-bookings";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); // itemIds
  const [modal, setModal] = useState(null); // { rows, decision }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${apiBase}/${id}`, { withCredentials: true })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [apiBase, id]);

  // แถวรายคน (Training: แตกจากกลุ่มตามหลักสูตร)
  const rows = useMemo(() => {
    if (!data) return [];
    if (isTraining)
      return (data.groups || []).flatMap((g) =>
        g.employees.map((e) => ({ ...e, trainingId: g.trainingId, trainingName: g.trainingName })),
      );
    return data.employees || [];
  }, [data, isTraining]);

  const hasItemIds = rows.some((r) => r.itemId); // backend ใหม่แล้วหรือยัง
  const pendingRows = rows.filter((r) => (r.status || "pending") === "pending");
  const allPendingSelected =
    pendingRows.length > 0 && pendingRows.every((r) => selected.includes(r.itemId));

  const toggle = (itemId) =>
    setSelected((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
  const toggleAll = () =>
    setSelected(allPendingSelected ? [] : pendingRows.map((r) => r.itemId));

  const save = async (rowsToSave, body) => {
    try {
      setSaving(true);
      const res = await axios.patch(
        `${apiBase}/${id}/items`,
        { itemIds: rowsToSave.map((r) => r.itemId), ...body },
        { withCredentials: true },
      );
      setData(res.data);
      setSelected([]);
      setModal(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const undo = (r) => {
    if (!window.confirm(`ย้อนสถานะของ ${r.fullName} กลับเป็น "รอ HR"?`)) return;
    save([r], { decision: "pending" });
  };

  const backLink = (
    <Link to={listPath} className="mb-1 inline-block text-[13px] text-gray-500 no-underline hover:text-gray-800">
      ← {isTraining ? "Training Bookings" : "Medical Bookings"}
    </Link>
  );

  if (loading || !data)
    return (
      <div className="mx-auto w-full max-w-[1800px]">
        {backLink}
        <div className="p-10 text-center text-sm text-gray-500">
          {loading ? "Loading..." : "ไม่พบคำขอนี้"}
        </div>
      </div>
    );

  const counts = data.counts || { pending: rows.length, confirmed: 0, rejected: 0 };
  const selectedRows = rows.filter((r) => selected.includes(r.itemId));

  // คนที่ยืนยันอบรมแล้ว → ไปบันทึก certification ทั้งกลุ่ม (แยกตามหลักสูตร)
  const confirmedByTraining = isTraining
    ? Object.values(
        rows
          .filter((r) => r.status === "confirmed")
          .reduce((acc, r) => {
            (acc[r.trainingId] ||= { trainingId: r.trainingId, trainingName: r.trainingName, rows: [] }).rows.push(r);
            return acc;
          }, {}),
      )
    : [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {backLink}

      {/* ════════ หัว ════════ */}
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-bold">
            {isTraining ? "🎓 คำขอจัด Training" : "🏥 คำขอนัดตรวจสุขภาพ"}
          </h1>
          <div className="text-[13px] text-gray-500">
            {data.requestedByName ? `ขอโดย ${data.requestedByName} · ` : ""}
            {fmtDateTime(data.createdAt)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <span>
              <span className="text-gray-500">วันที่ต้องการ </span>
              <b>{fmtRange(data.requestedStart, data.requestedEnd) || "—"}</b>
            </span>
            <span>
              <span className="text-gray-500">{isTraining ? "ศูนย์อบรม " : "โรงพยาบาล "}</span>
              <b>{data.provider || "—"}</b>
            </span>
            {data.remarks && (
              <span>
                <span className="text-gray-500">หมายเหตุ </span>
                {data.remarks}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-md bg-[#fff3cd] px-2 py-1 text-[#664d03]">⏳ รอ HR {counts.pending}</span>
          <span className="rounded-md bg-[#d1e7dd] px-2 py-1 text-[#0f5132]">✓ ยืนยัน {counts.confirmed}</span>
          <span className="rounded-md bg-[#f8d7da] px-2 py-1 text-[#842029]">✕ ปฏิเสธ {counts.rejected}</span>
        </div>
      </div>

      {!hasItemIds && (
        <div className="mt-3 rounded-md border border-[#ffe69c] bg-[#fff8e1] px-3 py-2 text-xs text-[#664d03]">
          ⚠ backend ยังเป็นเวอร์ชันเก่า — ยืนยัน / ปฏิเสธรายคนไม่ได้ (อัปเดต trainingRequestService / medicalRequestService ก่อน)
        </div>
      )}

      {/* ════════ แถบเลือก ════════ */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
          <input
            type="checkbox"
            checked={allPendingSelected}
            onChange={toggleAll}
            disabled={!hasItemIds || pendingRows.length === 0}
            className="h-[15px] w-[15px]"
          />
          เลือกทุกคนที่รอ HR ({pendingRows.length})
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() => setModal({ rows: selectedRows, decision: "confirmed" })}
            className={`${BTN} border-[#198754] bg-[#198754] text-white hover:bg-[#157347]`}
          >
            ✓ ยืนยันที่เลือก ({selectedRows.length})
          </button>
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() => setModal({ rows: selectedRows, decision: "rejected" })}
            className={`${BTN} border-[#f5c6cb] bg-white text-[#dc3545] hover:bg-red-50`}
          >
            ✕ ปฏิเสธที่เลือก
          </button>
        </div>
      </div>

      {/* ════════ ตารางรายคน ════════ */}
      <div className="overflow-x-auto border-t border-gray-200">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={`${TH} w-9`} />
              <th className={TH}>พนักงาน</th>
              <th className={TH}>{isTraining ? "หลักสูตร" : "การตรวจ"}</th>
              <th className={TH}>ผลจาก HR</th>
              <th className={`${TH} text-center`}>สถานะ</th>
              <th className={`${TH} w-[150px] text-right`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const st = r.status || "pending";
              const [label, cls] = STATUS[st] || STATUS.pending;
              return (
                <tr
                  key={r.itemId || i}
                  className={`border-b border-gray-100 ${selected.includes(r.itemId) ? "bg-[#f0f7ff]" : ""}`}
                >
                  <td className={TD}>
                    {st === "pending" && hasItemIds && (
                      <input
                        type="checkbox"
                        checked={selected.includes(r.itemId)}
                        onChange={() => toggle(r.itemId)}
                        className="h-[15px] w-[15px] cursor-pointer"
                      />
                    )}
                  </td>
                  <td className={TD}>
                    <Link
                      to={`/workers/${r.employeeId}`}
                      className="font-semibold text-gray-900 no-underline hover:text-blue-600"
                    >
                      {r.fullName}
                    </Link>
                    <div className="text-[11px] text-gray-500">
                      {r.empId || r.empCode} · {r.position || "—"}
                      {r.clientName && ` · ${r.clientName}`}
                    </div>
                  </td>
                  <td className={TD}>
                    {isTraining ? (
                      r.trainingName
                    ) : (
                      <>
                        {r.checkType}
                        {r.reason && (
                          <div className="text-[11px] text-gray-500">{REASON[r.reason] || r.reason}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td className={TD}>
                    {st === "confirmed" ? (
                      <>
                        <div className="font-semibold">
                          {fmtRange(r.confirmedStart, r.confirmedEnd) || "—"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {r.confirmedProvider || ""}
                        </div>
                      </>
                    ) : null}
                    {r.hrNote && <div className="text-[11px] text-gray-600">💬 {r.hrNote}</div>}
                    {r.decidedByName && (
                      <div className="text-[10px] text-gray-400">
                        โดย {r.decidedByName}
                        {r.decidedAt && ` · ${fmtDateTime(r.decidedAt)}`}
                      </div>
                    )}
                    {st === "pending" && <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                      {label}
                    </span>
                  </td>
                  <td className={`${TD} text-right`}>
                    {hasItemIds &&
                      (st === "pending" ? (
                        <button
                          type="button"
                          onClick={() => setModal({ rows: [r], decision: "confirmed" })}
                          className={`${BTN} border-[#198754] bg-white text-[#198754] hover:bg-[#198754] hover:text-white`}
                        >
                          ยืนยัน / ปฏิเสธ
                        </button>
                      ) : (
                        <span className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => setModal({ rows: [r], decision: st })}
                            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => undo(r)}
                            title="ย้อนกลับเป็นรอ HR"
                            className="cursor-pointer border-none bg-transparent p-0 text-xs text-gray-500 hover:text-gray-800"
                          >
                            ↩
                          </button>
                        </span>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════════ อบรมเสร็จ → บันทึก certification ════════ */}
      {confirmedByTraining.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <div className="mb-2 text-[13px] font-bold">อบรมเสร็จแล้ว? บันทึกผลเข้าประวัติพนักงาน</div>
          <div className="flex flex-wrap gap-2">
            {confirmedByTraining.map((g) => {
              const end = g.rows.map((r) => r.confirmedEnd).filter(Boolean).sort().pop();
              const qs = new URLSearchParams({
                trainingId: g.trainingId,
                empIds: g.rows.map((r) => r.employeeId).join(","),
                ...(end ? { issued: toYMD(end) } : {}),
              });
              return (
                <Link
                  key={g.trainingId}
                  to={`/certifications/bulk-add?${qs}`}
                  className={`${BTN} border-gray-200 bg-white text-gray-700 no-underline hover:bg-gray-50`}
                >
                  ✓ บันทึกผลอบรม {g.trainingName} ({g.rows.length} คน) →
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <DecisionModal
          isTraining={isTraining}
          rows={modal.rows}
          batch={data}
          initialDecision={modal.decision}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={(body) => save(modal.rows, body)}
        />
      )}
    </div>
  );
}
