import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════
const emptyForm = {
  name: "",
  nameTH: "",
  category: "", // ไม่มีช่องกรอกแล้ว แต่ยังส่งค่าเดิมกลับไป กันข้อมูลเก่าหาย
  isOffshore: false, // เช่นเดียวกัน
};

// "a\nb\nc" -> ["a","b","c"]
const toItems = (text) =>
  (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

// ["a","","b"] -> "a\nb"
const toText = (items) => items.filter((i) => i.trim()).join("\n");

const autoGrow = (el) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
const CARD = "rounded-[10px] border border-gray-200 bg-white";
const INPUT =
  "box-border w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400";
const LABEL = "mb-1.5 block text-[13px] font-semibold";
const TH =
  "sticky top-0 z-[1] whitespace-nowrap bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.5px] text-gray-500 shadow-[inset_0_-1px_0_#dee2e6]";
const ICON_BTN =
  "cursor-pointer rounded-md border-none px-2 py-1 text-[13px] leading-none transition-all hover:-translate-y-px";
const EDIT_BTN = `${ICON_BTN} bg-[#e7f1ff] shadow-[0_1px_3px_rgba(13,110,253,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(13,110,253,0.3),0_2px_3px_rgba(0,0,0,0.08)]`;
const DELETE_BTN = `${ICON_BTN} bg-[#fff5f5] shadow-[0_1px_3px_rgba(220,53,69,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(220,53,69,0.3),0_2px_3px_rgba(0,0,0,0.08)]`;

// ══════════════════════════════════════════════════════════
// small components
// ══════════════════════════════════════════════════════════
function MatrixCell({ count }) {
  return count > 0 ? (
    <span
      className="font-semibold text-[#198754]"
      title="มี training requirement (รวมทุก contract)"
    >
      {count}
    </span>
  ) : (
    <span
      className="whitespace-nowrap rounded-md bg-[#fff3cd] px-2 py-0.5 text-[11px] font-semibold text-[#664d03]"
      title="ยังไม่มี matrix — ระบบจะคัดเลือกคนตำแหน่งนี้ไม่ได้"
    >
      no matrix
    </span>
  );
}

function RespCell({ lines }) {
  return lines.length > 0 ? (
    <span
      className="font-semibold text-[#198754]"
      title={lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}
    >
      {lines.length}
    </span>
  ) : (
    <span
      className="whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500"
      title="ยังไม่กรอก — ส่วน Responsibility ในเรซูเม่ (Generate CV Summary) จะไม่โชว์"
    >
      not set
    </span>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function ManagePositions() {
  const { backendUrl } = useContext(AppContent);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // position object | null (create)
  const [form, setForm] = useState(emptyForm);
  const [respItems, setRespItems] = useState([""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/positions/manage`, {
        withCredentials: true,
      });
      setPositions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // กด Esc ปิด modal
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => e.key === "Escape" && !saving && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, saving]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setRespItems([""]);
    setError("");
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      nameTH: p.nameTH || "",
      category: p.category || "",
      isOffshore: p.isOffshore || false,
    });
    const items = toItems(p.responsibilities);
    setRespItems(items.length > 0 ? items : [""]);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) {
      setError("Position name is required.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        nameTH: form.nameTH || null,
        category: form.category || null,
        isOffshore: form.isOffshore,
        responsibilities: toText(respItems) || null,
      };
      if (editing) {
        await axios.put(`${backendUrl}/api/positions/${editing.id}`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post(`${backendUrl}/api/positions`, payload, {
          withCredentials: true,
        });
      }
      closeModal();
      fetchPositions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save position.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const workers = p._count?.employees ?? 0;
    const warn =
      workers > 0 ? `\n\n⚠ ตำแหน่งนี้มีพนักงานอยู่ ${workers} คน` : "";
    if (!window.confirm(`ลบตำแหน่ง "${p.name}" ?${warn}`)) return;
    try {
      await axios.delete(`${backendUrl}/api/positions/${p.id}`, {
        withCredentials: true,
      });
      fetchPositions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete position.");
    }
  };

  const updateItem = (i, value) =>
    setRespItems((prev) => prev.map((x, idx) => (idx === i ? value : x)));

  const removeItem = (i) =>
    setRespItems((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length > 0 ? next : [""];
    });

  // ── derived ──
  const q = search.trim().toLowerCase();
  const filtered = positions.filter(
    (p) =>
      !q ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.nameTH || "").toLowerCase().includes(q),
  );
  const totalWorkers = filtered.reduce(
    (sum, p) => sum + (p._count?.employees ?? 0),
    0,
  );
  const previewLines = respItems.filter((i) => i.trim());

  const emptyText = loading
    ? "Loading..."
    : q
      ? `ไม่พบตำแหน่ง "${search}"`
      : "No positions yet — click + New Position";

  const renderActions = (p) => (
    <div className="flex justify-center gap-2">
      <button title="Edit" onClick={() => openEdit(p)} className={EDIT_BTN}>
        ✏️
      </button>
      <button
        title="Delete"
        onClick={() => handleDelete(p)}
        className={DELETE_BTN}
      >
        🗑
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div
        className={`${CARD} mb-4 flex flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-xl">🧰</span>
          <span className="text-lg font-bold">Manage Positions</span>
          <span className="basis-full text-xs text-gray-500 lg:basis-auto">
            ตำแหน่งกลาง (canonical) — ใช้ในฟอร์ม worker/project &amp; training
            matrix
          </span>
        </div>
        <button
          onClick={openCreate}
          className="w-full shrink-0 cursor-pointer rounded-lg border-none bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 md:w-auto"
        >
          + New Position
        </button>
      </div>

      {/* ════════ Search ════════ */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="🔍 ค้นหาตำแหน่ง (EN / TH)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT} sm:max-w-[320px]`}
        />
        {q && (
          <span className="text-xs text-gray-500">
            พบ {filtered.length} จาก {positions.length} ตำแหน่ง
          </span>
        )}
      </div>

      {/* ════════ List ════════ */}
      <div className={`${CARD} overflow-hidden`}>
        {/* ── ต่ำกว่า lg: การ์ด ── */}
        <div className="lg:hidden">
          {loading || filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-gray-500">
              {emptyText}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 text-[13px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words font-semibold">
                          {p.name}
                        </div>
                        {p.nameTH && (
                          <div className="text-xs text-gray-500">
                            {p.nameTH}
                          </div>
                        )}
                      </div>
                      {renderActions(p)}
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2.5 text-center">
                      {[
                        ["Workers", p._count?.employees ?? 0],
                        [
                          "Matrix",
                          <MatrixCell
                            key="m"
                            count={p._count?.requirements ?? 0}
                          />,
                        ],
                        [
                          "CV Resp.",
                          <RespCell
                            key="r"
                            lines={toItems(p.responsibilities)}
                          />,
                        ],
                      ].map(([label, content]) => (
                        <div key={label}>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-gray-400">
                            {label}
                          </div>
                          {content}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t-2 border-gray-200 bg-gray-50 px-4 py-3 text-[13px] font-bold">
                <span>รวม {filtered.length} ตำแหน่ง</span>
                <span className="text-blue-600">{totalWorkers} คน</span>
              </div>
            </>
          )}
        </div>

        {/* ── lg+: ตาราง ── */}
        <div className="hidden max-h-[76vh] overflow-y-auto lg:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={`${TH} text-left`}>POSITION</th>
                <th className={`${TH} text-center`}>WORKERS (คน)</th>
                <th className={`${TH} text-center`}>MATRIX (requirement)</th>
                <th className={`${TH} text-center`}>
                  CV RESPONSIBILITY (items)
                </th>
                <th className={`${TH} text-center`}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading || filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`transition-colors duration-150 hover:bg-gray-50 ${
                      idx < filtered.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.name}</div>
                      {p.nameTH && (
                        <div className="text-xs text-gray-500">{p.nameTH}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p._count?.employees ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MatrixCell count={p._count?.requirements ?? 0} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RespCell lines={toItems(p.responsibilities)} />
                    </td>
                    <td className="px-4 py-3">{renderActions(p)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="sticky bottom-0 bg-gray-50 shadow-[inset_0_2px_0_#dee2e6]">
                  <td className="px-4 py-3 text-[13px] font-bold">
                    รวม {filtered.length} ตำแหน่ง
                  </td>
                  <td
                    className="px-4 py-3 text-center font-bold text-blue-600"
                    title="รวมพนักงานทุกตำแหน่ง"
                  >
                    {totalWorkers}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ════════ Modal ════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-3 sm:p-5"
          onClick={() => !saving && closeModal()}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[10px] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 bg-[#1e3a5f] px-4 py-4 text-white sm:px-6">
              <span className="text-base font-semibold">
                🧰 {editing ? "Edit Position" : "New Position"}
              </span>
              <button
                onClick={closeModal}
                disabled={saving}
                className="cursor-pointer border-none bg-transparent text-xl leading-none text-white"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-[#f5c6cb] bg-[#f8d7da] px-3.5 py-2.5 text-[13px] text-[#842029]">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className={LABEL}>
                  Position Name *{" "}
                  <span className="font-normal text-gray-500">(canonical)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Welder, Regular"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT}
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className={LABEL}>Name (TH)</label>
                <input
                  type="text"
                  placeholder="ชื่อภาษาไทย"
                  value={form.nameTH}
                  onChange={(e) => setForm({ ...form, nameTH: e.target.value })}
                  className={INPUT}
                />
              </div>

              {/* CV Responsibility */}
              <div>
                <label className={LABEL}>
                  CV Responsibility{" "}
                  <span className="font-normal text-gray-500">
                    (แสดงในเรซูเม่ตอน "Generate CV Summary" — Allocation)
                  </span>
                </label>
                <div className="mb-2 text-xs text-gray-500">
                  แต่ละกล่อง = 1 ข้อ พิมพ์ยาวได้ตามสบาย ระบบจะขึ้นเลข 1. 2. 3.
                  ... ให้อัตโนมัติตอนแสดงในเรซูเม่
                </div>

                {respItems.map((item, i) => (
                  <div key={i} className="mb-2 flex items-start gap-2">
                    <div className="min-w-[22px] pt-[9px] text-right text-xs font-semibold text-gray-500">
                      {i + 1}.
                    </div>
                    <textarea
                      rows={1}
                      ref={autoGrow}
                      placeholder="พิมพ์ข้อความ... (ยาวได้ ไม่ต้องกลัวตกบรรทัด)"
                      value={item}
                      onChange={(e) => {
                        updateItem(i, e.target.value);
                        autoGrow(e.target);
                      }}
                      className={`${INPUT} min-h-[38px] flex-1 resize-none overflow-hidden`}
                    />
                    <button
                      type="button"
                      title="ลบข้อนี้"
                      onClick={() => removeItem(i)}
                      className="shrink-0 cursor-pointer rounded-md border-none bg-[#fff5f5] px-2.5 py-1.5 text-[13px] text-[#dc3545] hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setRespItems([...respItems, ""])}
                  className="mb-3 mt-1 cursor-pointer rounded-md border-none bg-[#e7f1ff] px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-[#d6e8ff]"
                >
                  + เพิ่มข้อ
                </button>

                {previewLines.length > 0 && (
                  <div className="mt-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-gray-500">
                      Preview ในเรซูเม่
                    </div>
                    {previewLines.map((line, i) => (
                      <div key={i} className="break-words">
                        {i + 1}. {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                onClick={closeModal}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2 text-[13px] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer rounded-lg border-none bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
