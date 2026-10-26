import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// New manpower requirement — ใช้ร่วมกัน 2 หน้า
//   • Manpower Requirements (/requirements)
//   • Projects & Positions › Projects (/projects)
// สร้าง Project (requirement) ผูกกับ ON Number + position request ทีละตำแหน่ง
// → ข้อมูลไปอยู่ที่ ManpowerRequest ชุดเดียวกับหน้า ProjectDetail
// ══════════════════════════════════════════════════════════

// วิธีเดินทางขาไป — ค่าเดียวกับ enum TravelMode ใน schema.prisma
export const TRAVEL_MODE_OPTIONS = [
  ["boat", "🚢 เรือ"],
  ["helicopter", "🚁 เฮลิคอปเตอร์"],
  ["vehicle", "🚐 รถ"],
  ["other", "อื่นๆ"],
];
const TRAVEL_KNOWN = TRAVEL_MODE_OPTIONS.map(([v]) => v);

// ค่าใน DB → ฟอร์ม: ค่าที่ไม่อยู่ในรายการ = "อื่นๆ" ที่พิมพ์เอง
export const splitTravel = (v) =>
  !v
    ? { travelMode: "", travelOther: "" }
    : TRAVEL_KNOWN.includes(v)
      ? { travelMode: v, travelOther: "" }
      : { travelMode: "other", travelOther: v };

// ฟอร์ม → ค่าที่ส่ง backend: "อื่นๆ" ส่งข้อความที่พิมพ์ (ถ้าไม่พิมพ์ส่ง "other")
export const joinTravel = (f) =>
  f.travelMode === "other" ? f.travelOther.trim() || "other" : f.travelMode || null;

// ค่าเริ่มต้น "ตอบกลับภายใน" (วัน) นับจากวันที่ approve
export const DEFAULT_RESPONSE_DAYS = 10;

export const INPUT =
  "w-full box-border rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-400";
export const LABEL = "mb-1.5 block text-[13px] font-semibold";

export function TravelModeField({ form, setForm }) {
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
          onChange={(e) => setForm((prev) => ({ ...prev, travelOther: e.target.value }))}
          className={`${INPUT} mt-2`}
        />
      )}
    </div>
  );
}

// แถวตำแหน่ง — key ใช้เป็น React key เท่านั้น
let positionRowSeq = 0;
const newPositionRow = () => ({ key: ++positionRowSeq, positionId: "", quantity: "1" });

const emptyForm = () => ({
  location: "",
  startDate: "",
  endDate: "",
  isOffshore: false,
  travelMode: "",
  travelOther: "",
  responseDays: String(DEFAULT_RESPONSE_DAYS),
  notes: "",
});

const SELECT_STYLES = {
  control: (base) => ({
    ...base,
    borderColor: "#d1d5db",
    borderRadius: "8px",
    minHeight: "38px",
    fontSize: "13px",
  }),
  option: (base) => ({ ...base, fontSize: "13px" }),
  menuPortal: (base) => ({ ...base, zIndex: 1000001 }),
};
const MENU_PORTAL = typeof document !== "undefined" ? document.body : null;

const MODAL_HEAD =
  "flex shrink-0 items-center justify-between gap-3 bg-[#1e3a5f] px-4 py-4 text-white sm:px-6";
const MODAL_FOOT =
  "flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3.5 sm:px-6";
const BTN_CANCEL =
  "cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2 text-[13px] hover:bg-gray-50";

const recordOption = (r) => ({ value: r.id, label: `${r.projectCode} — ${r.jobTitle}`, record: r });

// prefillRecord = master record (ON Number) ที่เลือกไว้ให้แล้ว (เช่น กดจากแถวในหน้า Projects)
// onCreated(projectId, failedPositions[]) — เรียกหลังสร้างเสร็จ
export default function NewRequirementModal({ prefillRecord = null, onClose, onCreated }) {
  const { backendUrl } = useContext(AppContent);
  const [clients, setClients] = useState([]);
  const [positions, setPositions] = useState([]);
  const [record, setRecord] = useState(prefillRecord ? recordOption(prefillRecord) : null);
  const [contractId, setContractId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState(() => [newPositionRow()]);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/clients`, { withCredentials: true })
      .then((res) => setClients(res.data || []))
      .catch((err) => console.error(err));
    axios
      .get(`${backendUrl}/api/positions/manage`, { withCredentials: true })
      .then((res) => setPositions(res.data || []))
      .catch(() =>
        axios
          .get(`${backendUrl}/api/positions`, { withCredentials: true })
          .then((res) => setPositions(res.data || []))
          .catch((err) => console.error(err)),
      );
  }, [backendUrl]);

  // ── เดา Client / Contract จาก Company ของ ON Number (ยังเปลี่ยนเองได้) ──
  const guessContract = (r) => {
    if (!r?.company) return "";
    const q = r.company.toLowerCase();
    for (const c of clients) {
      if (c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())) {
        if (c.contracts?.length === 1) return c.contracts[0].id;
      }
    }
    return "";
  };
  useEffect(() => {
    if (record?.record && !contractId) setContractId(guessContract(record.record));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // Esc ปิด
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const loadRecordOptions = async (inputValue) => {
    try {
      const res = await axios.get(`${backendUrl}/api/projects/master-records`, {
        withCredentials: true,
        params: { search: inputValue },
      });
      return (res.data || []).map(recordOption);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const updateRow = (key, patch) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newPositionRow()]);
  const removeRow = (key) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newPositionRow()]));

  const positionName = (pid) => positions.find((p) => p.id === pid)?.name || "";
  const chosen = rows.filter((r) => r.positionId);

  // ข้อความแรกที่ยังขาด — null = ส่งได้
  const missing = (() => {
    if (!record) return "กรุณาเลือก Project (ON Number)";
    if (!contractId) return "กรุณาเลือก Client / Contract";
    if (!form.startDate) return "กรุณาระบุ Working start";
    if (!form.endDate) return "กรุณาระบุ Working end";
    if (form.endDate < form.startDate) return "Working end ต้องไม่ก่อน Working start";
    if (!form.location.trim()) return "กรุณาระบุ Working location";
    if (chosen.length === 0) return "กรุณาเลือกตำแหน่งอย่างน้อย 1 ตำแหน่ง";
    if (chosen.some((r) => !(Number(r.quantity) >= 1))) return "Quantity ต้องเป็น 1 ขึ้นไป";
    return null;
  })();

  const submit = async () => {
    if (missing) {
      alert(missing);
      return;
    }
    try {
      setSaving(true);
      const res = await axios.post(
        `${backendUrl}/api/projects`,
        {
          masterProjectRecordId: record.value,
          contractId,
          location: form.location.trim() || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          isOffshore: form.isOffshore,
          travelMode: joinTravel(form),
          responseDays: Number(form.responseDays) || DEFAULT_RESPONSE_DAYS,
          notes: form.notes || null,
        },
        { withCredentials: true },
      );
      const projectId = res.data.id;

      // position request ทีละตำแหน่ง — endpoint เดียวกับ + Add Position ในหน้า ProjectDetail
      const failed = [];
      for (const r of chosen) {
        try {
          await axios.post(
            `${backendUrl}/api/projects/${projectId}/requests`,
            { positionId: r.positionId, quantity: Number(r.quantity) },
            { withCredentials: true },
          );
        } catch (err) {
          console.error(err);
          failed.push(positionName(r.positionId) || r.positionId);
        }
      }
      if (failed.length) {
        alert(
          `สร้าง requirement แล้ว แต่เพิ่มตำแหน่งไม่สำเร็จ ${failed.length} ตำแหน่ง:\n${failed.join("\n")}\n\nเพิ่มต่อได้ที่ปุ่ม + Add Position ในหน้ารายละเอียด`,
        );
      }
      onCreated?.(projectId, failed);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "สร้าง requirement ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const disabled = !!missing || saving;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onClick={() => !saving && onClose()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[10px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEAD}>
          <span className="text-base font-semibold">New manpower requirement</span>
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer border-none bg-transparent text-xl leading-none text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ── Project (ON Number) ── */}
          <label className={LABEL}>Project *</label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadRecordOptions}
            value={record}
            onChange={(o) => {
              setRecord(o);
              setContractId(o?.record ? guessContract(o.record) : "");
            }}
            placeholder="ค้นหา ON Number หรือชื่องาน..."
            isClearable
            noOptionsMessage={({ inputValue }) =>
              inputValue ? "ไม่พบ ON Number ที่ตรงกัน" : "พิมพ์เพื่อค้นหา ON Number..."
            }
            styles={SELECT_STYLES}
            menuPortalTarget={MENU_PORTAL}
          />
          {record && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span>
                🏢 Company: <strong className="text-gray-700">{record.record.company || "—"}</strong>
              </span>
              <span>
                Customer:{" "}
                <strong className="text-gray-700">{record.record.customerName || "—"}</strong>
              </span>
            </div>
          )}

          {/* ── Client / Contract ── */}
          <div className="mt-4">
            <label className={LABEL}>Client / Contract *</label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)} className={INPUT}>
              <option value="">Select client...</option>
              {clients.map((c) =>
                c.contracts?.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {c.name} — {ct.name}
                  </option>
                )),
              )}
            </select>
            <div className="mt-1 text-[11px] text-gray-400">
              ใช้ Training Matrix ของ contract นี้คำนวณ % Match · ชื่อ requirement ใช้ "Project / Job"
              ของ ON Number อัตโนมัติ
            </div>
          </div>

          {/* ── Working start / end ── */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Working start *</label>
              <input
                type="date"
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Working end *</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className={INPUT}
              />
            </div>
          </div>

          {/* ── Working location + Onshore/Offshore ── */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_170px]">
            <div>
              <label className={LABEL}>Working location *</label>
              <input
                type="text"
                placeholder="e.g. Erawan WP-12 / Songkhla Workshop 4"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Onshore / Offshore</label>
              <select
                value={form.isOffshore ? "offshore" : "onshore"}
                onChange={(e) => setForm((p) => ({ ...p, isOffshore: e.target.value === "offshore" }))}
                className={INPUT}
              >
                <option value="onshore">Onshore</option>
                <option value="offshore">Offshore</option>
              </select>
            </div>
          </div>

          {/* ── Positions ── */}
          <div className="mt-4">
            <div className="mb-1.5 grid grid-cols-[1fr_76px_28px] gap-2">
              <span className="text-[13px] font-semibold">Position *</span>
              <span className="text-[13px] font-semibold">Quantity *</span>
              <span />
            </div>
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const taken = new Set(
                  rows.filter((r) => r.key !== row.key && r.positionId).map((r) => r.positionId),
                );
                const options = positions
                  .filter((p) => !taken.has(p.id))
                  .map((p) => ({ value: p.id, label: p.name }));
                return (
                  <div key={row.key} className="grid grid-cols-[1fr_76px_28px] items-center gap-2">
                    <Select
                      options={options}
                      value={options.find((o) => o.value === row.positionId) || null}
                      onChange={(o) => updateRow(row.key, { positionId: o?.value || "" })}
                      placeholder="— Select position —"
                      noOptionsMessage={() => "ไม่พบตำแหน่ง"}
                      styles={SELECT_STYLES}
                      menuPortalTarget={MENU_PORTAL}
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      className={`${INPUT} text-center`}
                    />
                    <button
                      type="button"
                      title="ลบแถวนี้"
                      onClick={() => removeRow(row.key)}
                      className="h-7 w-7 cursor-pointer rounded-md border-none bg-transparent text-base leading-none text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= positions.length}
              className="mt-2 cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
            >
              + Add another position
            </button>
          </div>

          {/* ── Remarks ── */}
          <div className="mt-4">
            <label className={LABEL}>Remarks</label>
            <textarea
              rows={2}
              placeholder="Certificates needed, shift, etc."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className={`${INPUT} resize-y`}
            />
          </div>

          {/* ── ตัวเลือกเพิ่มเติม ── */}
          <div className="mt-4 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between border-none bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              <span>
                ตัวเลือกเพิ่มเติม — วิธีเดินทาง · ตอบรับภายใน{" "}
                {form.responseDays || DEFAULT_RESPONSE_DAYS} วัน
              </span>
              <span>{showMore ? "▲" : "▼"}</span>
            </button>
            {showMore && (
              <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2">
                <TravelModeField form={form} setForm={setForm} />
                <div>
                  <label className={LABEL}>พนักงานต้องตอบรับภายใน (วัน)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.responseDays}
                    onChange={(e) => setForm((p) => ({ ...p, responseDays: e.target.value }))}
                    className={INPUT}
                  />
                  <div className="mt-1 text-[11px] text-gray-400">
                    นับจากวันที่ approve ที่หน้า Assign Names — แสดงให้พนักงานเห็นใน Worker App
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`${MODAL_FOOT} items-center`}>
          {missing && !saving && (
            <span className="mr-auto text-[11px] text-gray-400">{missing}</span>
          )}
          <button onClick={onClose} className={BTN_CANCEL}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={disabled}
            className={`rounded-lg border-none px-5 py-2 text-[13px] font-semibold text-white ${
              disabled ? "cursor-not-allowed bg-gray-400" : "cursor-pointer bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "กำลังบันทึก..." : "Submit requirement"}
          </button>
        </div>
      </div>
    </div>
  );
}
