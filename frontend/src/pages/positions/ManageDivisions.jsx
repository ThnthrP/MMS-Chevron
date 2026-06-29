import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";

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
  }, [backendUrl]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("กรอกชื่อ department");
      return;
    }
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

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    if (!name) {
      toast.error("ชื่อห้ามว่าง");
      return;
    }
    try {
      await axios.put(
        `${backendUrl}/api/divisions/${id}`,
        { name },
        { withCredentials: true },
      );
      toast.success("เปลี่ยนชื่อแล้ว (อัปเดตพนักงานที่ใช้ชื่อเดิมให้ด้วย)");
      cancelEdit();
      fetchDivisions();
    } catch (err) {
      toast.error(err.response?.data?.message || "บันทึกไม่สำเร็จ");
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

  // ── styles ──
  const card = {
    background: "#fff",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    overflow: "hidden",
  };
  const th = {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    borderBottom: "1px solid #e9ecef",
  };
  const td = {
    padding: "12px 14px",
    fontSize: "13px",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "middle",
  };
  const input = {
    border: "1px solid #ced4da",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    boxSizing: "border-box",
  };
  const btn = (color, bg = "#fff") => ({
    border: `1px solid ${color}`,
    background: bg,
    color: bg === "#fff" ? color : "#fff",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        maxWidth: "780px",
        margin: "0 auto",
        padding: "8px 4px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* header */}
      <div style={{ ...card, padding: "18px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800 }}>
          🗂 Manage Departments
        </div>
        <div style={{ marginTop: "4px", fontSize: "12px", color: "#6c757d" }}>
          รายการแผนก/ดิวิชั่น ใช้เป็นตัวเลือกตอน Add/Edit Worker
        </div>
      </div>

      {/* add + search */}
      <div
        style={{
          ...card,
          padding: "14px 16px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="ชื่อ department ใหม่…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{ ...input, flex: "1 1 240px" }}
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          style={{
            ...btn("#0d6efd", adding ? "#adb5bd" : "#0d6efd"),
            padding: "9px 18px",
            fontSize: "13px",
          }}
        >
          {adding ? "Adding…" : "＋ Add"}
        </button>
        <div style={{ flexBasis: "100%", height: 0 }} />
        <input
          type="text"
          placeholder="🔍 ค้นหา…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, flex: "1 1 240px", maxWidth: "320px" }}
        />
      </div>

      {/* table */}
      <div style={card}>
        {loading ? (
          <div
            style={{ padding: "28px", textAlign: "center", color: "#6c757d" }}
          >
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{ padding: "28px", textAlign: "center", color: "#6c757d" }}
          >
            {search ? "ไม่พบ" : "ยังไม่มี department — เพิ่มด้านบนได้เลย"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Department</th>
                <th style={{ ...th, textAlign: "right", width: "200px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td style={td}>
                    {editId === d.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(d.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        style={{
                          ...input,
                          padding: "6px 10px",
                          width: "100%",
                          maxWidth: "300px",
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        justifyContent: "flex-end",
                      }}
                    >
                      {editId === d.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(d.id)}
                            style={btn("#198754", "#198754")}
                          >
                            Save
                          </button>
                          <button onClick={cancelEdit} style={btn("#6c757d")}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(d)}
                            style={btn("#0d6efd")}
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            style={btn("#dc3545")}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: "11px", color: "#adb5bd", paddingLeft: "4px" }}>
        * ลบ department ที่ยังมีพนักงานใช้อยู่ไม่ได้ (ระบบจะแจ้งเตือน) ·
        เปลี่ยนชื่อจะอัปเดตให้พนักงานที่ใช้ชื่อเดิมโดยอัตโนมัติ
      </div>
    </div>
  );
}
