import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
const CARD = "overflow-hidden rounded-[10px] border border-gray-200 bg-white";
const INPUT =
  "box-border rounded-lg border border-gray-300 px-3 py-[9px] text-[13px] outline-none focus:border-blue-400";

const BTN =
  "cursor-pointer whitespace-nowrap rounded-md border-none px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const BTN_SAVE = `${BTN} bg-[#d1e7dd] text-[#0f5132] shadow-[0_1px_3px_rgba(25,135,84,0.25),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(25,135,84,0.35),0_2px_3px_rgba(0,0,0,0.08)]`;
const BTN_CANCEL = `${BTN} bg-gray-100 text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(0,0,0,0.18),0_2px_3px_rgba(0,0,0,0.08)]`;
const BTN_RENAME = `${BTN} bg-[#e7f1ff] text-blue-600 shadow-[0_1px_3px_rgba(13,110,253,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(13,110,253,0.3),0_2px_3px_rgba(0,0,0,0.08)]`;
const BTN_DELETE = `${BTN} bg-[#fff5f5] text-[#842029] shadow-[0_1px_3px_rgba(220,53,69,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_6px_rgba(220,53,69,0.3),0_2px_3px_rgba(0,0,0,0.08)]`;

const TH =
  "sticky top-0 z-[1] bg-white px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.3px] text-gray-500 shadow-[inset_0_-1px_0_#e9ecef]";

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
export default function ManageDivisions() {
  const { backendUrl } = useContext(AppContent);

  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // inline edit
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchDivisions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/divisions`, {
        withCredentials: true,
      });
      setDivisions(res.data);
    } catch (err) {
      console.error(err);
      toast.error("โหลด departments ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("กรอกชื่อ department");
      return;
    }
    if (adding) return; // กด Enter รัวๆ
    try {
      setAdding(true);
      await axios.post(
        `${backendUrl}/api/divisions`,
        { name },
        { withCredentials: true },
      );
      toast.success(`เพิ่ม "${name}" แล้ว`);
      setNewName("");
      fetchDivisions();
    } catch (err) {
      toast.error(err.response?.data?.message || "เพิ่มไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditName(d.name);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const handleSaveEdit = async (d) => {
    const name = editName.trim();
    if (!name) {
      toast.error("ชื่อห้ามว่าง");
      return;
    }
    // ชื่อไม่เปลี่ยน — ไม่ต้องยิง API (เดิมยิงไปและอัปเดตพนักงานทุกคนโดยไม่จำเป็น)
    if (name === d.name) {
      cancelEdit();
      return;
    }
    if (savingEdit) return;
    try {
      setSavingEdit(true);
      await axios.put(
        `${backendUrl}/api/divisions/${d.id}`,
        { name },
        { withCredentials: true },
      );
      toast.success("เปลี่ยนชื่อแล้ว (อัปเดตพนักงานที่ใช้ชื่อเดิมให้ด้วย)");
      cancelEdit();
      fetchDivisions();
    } catch (err) {
      toast.error(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`ลบ department "${d.name}"?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/divisions/${d.id}`, {
        withCredentials: true,
      });
      toast.success("ลบแล้ว");
      fetchDivisions();
    } catch (err) {
      toast.error(err.response?.data?.message || "ลบไม่สำเร็จ");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return divisions;
    return divisions.filter((d) => d.name.toLowerCase().includes(q));
  }, [divisions, search]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-4">
      {/* ════════ Header — เต็มความกว้างแบบหน้าอื่น ════════ */}
      <div className={`${CARD} p-4 sm:p-[18px]`}>
        <div className="text-xl font-extrabold">🗂 Manage Departments</div>
        <div className="mt-1 text-xs text-gray-500">
          รายการแผนก/ดิวิชั่น ใช้เป็นตัวเลือกตอน Add/Edit Worker
        </div>
      </div>

      {/* ════════ เนื้อหา — กว้างไม่เกิน 900px (มีแค่คอลัมน์ชื่อ) ════════ */}
      <div className="max-w-[900px] space-y-4">
        {/* Add + Search */}
        <div
          className={`${CARD} flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center`}
        >
          <div className="flex flex-1 gap-2.5">
            <input
              type="text"
              placeholder="ชื่อ department ใหม่…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={`${INPUT} min-w-0 flex-1`}
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-blue-600 px-[18px] py-[9px] text-[13px] font-semibold text-white shadow-[0_2px_5px_rgba(13,110,253,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(13,110,253,0.45)] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {adding ? "Adding…" : "＋ Add"}
            </button>
          </div>

          {/* เส้นคั่น — เฉพาะจอ sm+ */}
          <div className="mx-1 hidden w-px self-stretch bg-gray-200 sm:block" />

          <input
            type="text"
            placeholder="🔍 ค้นหา…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT} w-full sm:w-[260px]`}
          />
        </div>

        {/* Table */}
        <div className={CARD}>
          <div className="flex items-center justify-between border-b border-gray-200 px-3.5 py-2 text-xs text-gray-500">
            <span>
              {search
                ? `พบ ${filtered.length} จาก ${divisions.length} รายการ`
                : `ทั้งหมด ${divisions.length} รายการ`}
            </span>
          </div>

          {loading ? (
            <div className="p-7 text-center text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-7 text-center text-gray-500">
              {search
                ? `ไม่พบ "${search}"`
                : "ยังไม่มี department — เพิ่มด้านบนได้เลย"}
            </div>
          ) : (
            <div className="overflow-auto lg:max-h-[calc(100vh-360px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${TH} text-left`}>Department</th>
                    <th className={`${TH} w-[200px] text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const isEditing = editId === d.id;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td
                          colSpan={isEditing ? 2 : 1}
                          className="border-b border-gray-100 px-3.5 py-3 align-middle text-[13px]"
                        >
                          {isEditing ? (
                            // โหมดแก้ไข — มือถือ: ช่องกรอกเต็มแถว ปุ่มลงบรรทัดใหม่
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit(d);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                autoFocus
                                className={`${INPUT} w-full px-2.5 py-1.5 sm:max-w-[300px]`}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveEdit(d)}
                                  disabled={savingEdit}
                                  className={BTN_SAVE}
                                >
                                  {savingEdit ? "Saving…" : "Save"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={savingEdit}
                                  className={BTN_CANCEL}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="break-words font-semibold">
                              {d.name}
                            </span>
                          )}
                        </td>
                        {!isEditing && (
                          <td className="border-b border-gray-100 px-3.5 py-3 text-right align-middle">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => startEdit(d)}
                                className={BTN_RENAME}
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDelete(d)}
                                className={BTN_DELETE}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pl-1 text-[11px] text-gray-400">
          * ลบ department ที่ยังมีพนักงานใช้อยู่ไม่ได้ (ระบบจะแจ้งเตือน) ·
          เปลี่ยนชื่อจะอัปเดตให้พนักงานที่ใช้ชื่อเดิมโดยอัตโนมัติ
        </div>
      </div>
    </div>
  );
}
