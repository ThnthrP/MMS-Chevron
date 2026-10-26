import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { AppContent } from "../../context/AppContext";

// ══════════════════════════════════════════════════════════
// constants
// ══════════════════════════════════════════════════════════
const INPUT =
  "box-border h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-blue-400";
const ICON =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50";

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
    const list = q
      ? divisions.filter((d) => d.name.toLowerCase().includes(q))
      : divisions;
    // เรียงตามตัวอักษร — อ่านไล่ลงทีละคอลัมน์ได้ง่าย
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, "th", { sensitivity: "base" }),
    );
  }, [divisions, search]);

  // จำนวนพนักงาน — โชว์เฉพาะเมื่อ API ส่งมา (ยังไม่ส่งก็ไม่แสดง ไม่พัง)
  const countOf = (d) => d._count?.employees ?? d.employeeCount ?? null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1800px] flex-col">
      {/* ════════ Header ════════ */}
      <div className="pb-3">
        <h1 className="m-0 text-lg font-bold">Departments</h1>
        <div className="text-xs text-gray-500">
          รายการแผนก/ดิวิชั่น ใช้เป็นตัวเลือกตอน Add/Edit Worker
        </div>
      </div>

      {/* ════════ Add + Search — แถวเดียว ════════ */}
      <div className="flex flex-col gap-2 border-y border-gray-200 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            type="text"
            placeholder="＋ ชื่อ department ใหม่… (Enter เพื่อเพิ่ม)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className={`${INPUT} min-w-0 flex-1 sm:max-w-[360px]`}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-md border-none bg-[#2B2F78] px-3.5 text-xs font-semibold text-white hover:bg-[#22265f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-xs text-gray-500">
            {search
              ? `พบ ${filtered.length} จาก ${divisions.length}`
              : `ทั้งหมด ${divisions.length} รายการ`}
          </span>
          <input
            type="text"
            placeholder="🔍 ค้นหา department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT} w-full sm:w-[260px]`}
          />
        </div>
      </div>

      {/* ════════ List — หลายคอลัมน์ตามความกว้างจอ (อ่านไล่ลงทีละคอลัมน์) ════════ */}
      {loading ? (
        <div className="p-7 text-center text-[13px] text-gray-500">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-7 text-center text-[13px] text-gray-500">
          {search
            ? `ไม่พบ "${search}"`
            : "ยังไม่มี department — เพิ่มด้านบนได้เลย"}
        </div>
      ) : (
        <div className="columns-1 gap-x-8 pt-1 sm:columns-[230px]">
          {filtered.map((d) => {
            const isEditing = editId === d.id;
            const count = countOf(d);
            return (
              <div
                key={d.id}
                className="flex h-9 break-inside-avoid items-center gap-1.5 border-b border-gray-100 px-1 text-[13px] hover:bg-gray-50"
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(d);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      className="box-border h-7 min-w-0 flex-1 rounded border border-blue-400 px-2 text-[13px] outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(d)}
                      disabled={savingEdit}
                      title="บันทึก (Enter)"
                      className={`${ICON} text-[#198754] hover:bg-[#d1e7dd]`}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      title="ยกเลิก (Esc)"
                      className={`${ICON} text-gray-500 hover:bg-gray-200`}
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="min-w-0 flex-1 cursor-text truncate font-medium text-gray-900"
                      title={`${d.name} — ดับเบิลคลิกเพื่อเปลี่ยนชื่อ`}
                      onDoubleClick={() => startEdit(d)}
                    >
                      {d.name}
                    </span>
                    {count != null && (
                      <span
                        className={`shrink-0 text-[11px] ${
                          count > 0 ? "text-gray-500" : "text-gray-300"
                        }`}
                        title="จำนวนพนักงานในแผนกนี้"
                      >
                        {count} คน
                      </span>
                    )}
                    {/* ปุ่มแก้ไข/ลบ โชว์ตลอด — เห็นทันทีว่าทำอะไรได้ */}
                    <span className="flex shrink-0 gap-0.5">
                      <button
                        onClick={() => startEdit(d)}
                        title="เปลี่ยนชื่อ"
                        className={`${ICON} text-blue-600 hover:bg-[#e7f1ff]`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        title="ลบ"
                        className={`${ICON} text-[#dc3545] hover:bg-[#fff5f5]`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-3 text-[11px] text-gray-400">
        * ลบ department ที่ยังมีพนักงานใช้อยู่ไม่ได้ (ระบบจะแจ้งเตือน) ·
        เปลี่ยนชื่อจะอัปเดตให้พนักงานที่ใช้ชื่อเดิมโดยอัตโนมัติ · ดับเบิลคลิกชื่อเพื่อแก้ได้เลย
      </div>
    </div>
  );
}
