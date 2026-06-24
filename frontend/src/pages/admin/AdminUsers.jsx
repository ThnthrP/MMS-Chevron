import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";

// ── role badge tones (fallback = เทา) ──
const ROLE_TONE = {
  admin: { bg: "#ede7f6", color: "#5e35b1" },
  manpower: { bg: "#e3f2fd", color: "#1565c0" },
  hr: { bg: "#e0f2f1", color: "#00695c" },
  pe: { bg: "#fff3e0", color: "#e65100" },
  safety: { bg: "#fce4ec", color: "#ad1457" },
  expert: { bg: "#f1f8e9", color: "#558b2f" },
  nurse: { bg: "#e8eaf6", color: "#3949ab" },
};
const roleTone = (name) =>
  ROLE_TONE[(name || "").toLowerCase()] || { bg: "#f1f3f5", color: "#6c757d" };

function RoleBadge({ name }) {
  const t = roleTone(name);
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        borderRadius: "6px",
        padding: "2px 10px",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {name || "—"}
    </span>
  );
}

export default function AdminUsers() {
  const { backendUrl, userData } = useContext(AppContent);

  const [users, setUsers] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [availableEmps, setAvailableEmps] = useState([]);
  const [roleDraft, setRoleDraft] = useState({}); // { userId: roleId } (แก้ค้างก่อน Save)
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // add-user modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    employeeId: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [userRes, roleRes, empRes] = await Promise.all([
        axios.get(`${backendUrl}/api/user/all`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/user/roles`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/user/available-employees`, {
          withCredentials: true,
        }),
      ]);
      if (userRes.data.success) {
        setUsers(userRes.data.users);
        const draft = {};
        userRes.data.users.forEach((u) => (draft[u.id] = u.role?.id));
        setRoleDraft(draft);
      }
      if (roleRes.data.success) setRoleList(roleRes.data.roles);
      if (empRes.data.success) setAvailableEmps(empRes.data.employees);
    } catch (error) {
      console.error(error);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [backendUrl]);

  const isSelf = (id) => id === userData?.id;

  // ── save role ──
  const handleSaveRole = async (userId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/user/role`,
        { userId, roleId: roleDraft[userId] },
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success("อัปเดต role แล้ว");
        fetchAll();
      } else {
        toast.error(res.data.message || "อัปเดตไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ── link / unlink employee ──
  const handleLinkEmployee = async (userId, employeeId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/user/${userId}/employee`,
        { employeeId: employeeId || null },
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success(employeeId ? "ผูก worker แล้ว" : "ยกเลิกการผูกแล้ว");
        fetchAll();
      } else {
        toast.error(res.data.message || "ไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ── delete ──
  const handleDelete = async (u) => {
    if (!window.confirm(`ลบผู้ใช้ "${u.name}"?`)) return;
    try {
      const res = await axios.delete(`${backendUrl}/api/user/${u.id}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        toast.success("ลบผู้ใช้แล้ว");
        fetchAll();
      } else {
        toast.error(res.data.message || "ลบไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ── create ──
  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.roleId) {
      toast.error("กรอก name, email, password, role ให้ครบ");
      return;
    }
    try {
      setSaving(true);
      const res = await axios.post(`${backendUrl}/api/user`, form, {
        withCredentials: true,
      });
      if (res.data.success) {
        toast.success("สร้างผู้ใช้แล้ว");
        setShowAdd(false);
        setForm({
          name: "",
          email: "",
          password: "",
          roleId: "",
          employeeId: "",
        });
        fetchAll();
      } else {
        toast.error(res.data.message || "สร้างไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [users, search]);

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
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "12px 14px",
    fontSize: "13px",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "middle",
  };
  const select = {
    border: "1px solid #ced4da",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    background: "#fff",
  };
  const input = {
    border: "1px solid #ced4da",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "8px 4px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* header */}
      <div
        style={{
          ...card,
          padding: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>
            👤 User Management
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#6c757d" }}>
            จัดการบัญชีผู้ใช้ · role · การผูกกับ worker
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: "#0d6efd",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ＋ Add User
        </button>
      </div>

      {/* search */}
      <div style={{ ...card, padding: "12px 14px" }}>
        <input
          type="text"
          placeholder="🔍 ค้นหาชื่อ หรือ email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, maxWidth: "360px" }}
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
            ไม่พบผู้ใช้
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Linked Worker</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const self = isSelf(u.id);
                  const dirty = roleDraft[u.id] !== u.role?.id;
                  // ตัวเลือก employee = available + คนที่ผูกอยู่ตอนนี้
                  const empOptions = [...availableEmps];
                  if (
                    u.employee &&
                    !empOptions.find((e) => e.id === u.employee.id)
                  ) {
                    empOptions.unshift(u.employee);
                  }
                  return (
                    <tr key={u.id}>
                      <td style={td}>
                        <span style={{ fontWeight: 700 }}>{u.name}</span>
                        {self && (
                          <span
                            style={{
                              marginLeft: "6px",
                              fontSize: "10px",
                              color: "#adb5bd",
                            }}
                          >
                            (you)
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, color: "#6c757d" }}>{u.email}</td>

                      {/* role: badge + dropdown */}
                      <td style={td}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <RoleBadge
                            name={
                              roleList.find((r) => r.id === roleDraft[u.id])
                                ?.name || u.role?.name
                            }
                          />
                          <select
                            value={roleDraft[u.id] || ""}
                            disabled={self}
                            onChange={(e) =>
                              setRoleDraft((p) => ({
                                ...p,
                                [u.id]: e.target.value,
                              }))
                            }
                            style={{
                              ...select,
                              cursor: self ? "not-allowed" : "pointer",
                            }}
                            title={self ? "เปลี่ยน role ตัวเองไม่ได้" : ""}
                          >
                            {roleList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* linked worker */}
                      <td style={td}>
                        <select
                          value={u.employee?.id || ""}
                          onChange={(e) =>
                            handleLinkEmployee(u.id, e.target.value)
                          }
                          style={select}
                        >
                          <option value="">— None —</option>
                          {empOptions.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.fullName} ({e.empCode})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* actions */}
                      <td style={td}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleSaveRole(u.id)}
                            disabled={self || !dirty}
                            style={{
                              border: `1px solid ${self || !dirty ? "#dee2e6" : "#0d6efd"}`,
                              background: "#fff",
                              color: self || !dirty ? "#adb5bd" : "#0d6efd",
                              borderRadius: "6px",
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: self || !dirty ? "default" : "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={self}
                            title={self ? "ลบบัญชีตัวเองไม่ได้" : "ลบผู้ใช้"}
                            style={{
                              border: `1px solid ${self ? "#dee2e6" : "#f5c2c7"}`,
                              background: "#fff",
                              color: self ? "#adb5bd" : "#842029",
                              borderRadius: "6px",
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: self ? "default" : "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User modal */}
      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{ ...card, width: "100%", maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "15px" }}>
                ＋ Add User
              </span>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <input
                style={input}
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                style={input}
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                style={input}
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <select
                style={input}
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                <option value="">-- Select Role --</option>
                {roleList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                style={input}
                value={form.employeeId}
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
              >
                <option value="">Link worker (optional)…</option>
                {availableEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.empCode})
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #e9ecef",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  border: "1px solid #dee2e6",
                  background: "#fff",
                  color: "#6c757d",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{
                  border: "none",
                  background: saving ? "#adb5bd" : "#0d6efd",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
