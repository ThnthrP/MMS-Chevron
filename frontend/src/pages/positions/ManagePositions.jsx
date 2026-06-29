import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

const CATEGORIES = ["Technical", "Supervisory", "Engineering"];

const emptyForm = { name: "", nameTH: "", category: "", isOffshore: false };

export default function ManagePositions() {
  const { backendUrl } = useContext(AppContent);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // position object หรือ null (create)
  const [form, setForm] = useState(emptyForm);
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
  }, []);

  // รวมจำนวนพนักงานทุกตำแหน่ง (โชว์ท้ายตาราง)
  const totalWorkers = positions.reduce(
    (sum, p) => sum + (p._count?.employees ?? 0),
    0,
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
    if (!confirm(`ลบตำแหน่ง "${p.name}" ?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/positions/${p.id}`, {
        withCredentials: true,
      });
      fetchPositions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete position.");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };
  const labelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🧰</span>
              <span style={{ fontSize: "18px", fontWeight: 700 }}>
                Manage Positions
              </span>
              <span style={{ color: "#6c757d", fontSize: "12px" }}>
                ตำแหน่งกลาง (canonical) — ใช้ในฟอร์ม worker/project &amp;
                training matrix
              </span>
            </div>
            <button
              onClick={openCreate}
              style={{
                background: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + New Position
            </button>
          </div>
        </div>

        {/* Info note */}
        {/* <div
          style={{
            background: "#e9f5fb",
            border: "1px solid #bee3f8",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "1.5rem",
            fontSize: "12px",
            color: "#055160",
          }}
        >
          ℹ️ ตำแหน่งที่สร้างที่นี่จะเลือกได้ในฟอร์ม Add/Edit Worker และ Project
          ทันที — แต่ถ้าจะให้ระบบ **คัดเลือก/เช็ค eligibility** ได้ ต้องสร้าง
          <strong> training matrix</strong> ของตำแหน่งนั้นต่อ contract ด้วย
          (ตัวจัดการ matrix จะมาเฟสถัดไป — ตอนนี้ matrix มาจากการ import)
        </div> */}

        {/* Table */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                {[
                  ["POSITION", "left"],
                  ["DEPARTMENT", "left"],
                  ["OFFSHORE", "center"],
                  ["WORKERS", "center"],
                  ["MATRIX", "center"],
                  ["ACTIONS", "center"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#6c757d",
                      letterSpacing: "0.5px",
                      textAlign: align,
                      background: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    No positions yet — click + New Position
                  </td>
                </tr>
              ) : (
                positions.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        idx < positions.length - 1
                          ? "1px solid #f1f3f5"
                          : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8f9fa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    {/* POSITION */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.nameTH && (
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          {p.nameTH}
                        </div>
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td style={{ padding: "12px 16px", color: "#6c757d" }}>
                      {p.category || "—"}
                    </td>

                    {/* OFFSHORE */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {p.isOffshore ? (
                        <span
                          style={{
                            background: "#cfe2ff",
                            color: "#084298",
                            borderRadius: "6px",
                            padding: "2px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Offshore
                        </span>
                      ) : (
                        <span style={{ color: "#adb5bd" }}>—</span>
                      )}
                    </td>

                    {/* WORKERS */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {p._count?.employees ?? 0}
                    </td>

                    {/* MATRIX */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {(p._count?.requirements ?? 0) > 0 ? (
                        <span
                          style={{ color: "#198754", fontWeight: 600 }}
                          title="มี training requirement (รวมทุก contract)"
                        >
                          {p._count.requirements}
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fff3cd",
                            color: "#664d03",
                            borderRadius: "6px",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                          title="ยังไม่มี matrix — ระบบจะคัดเลือกคนตำแหน่งนี้ไม่ได้"
                        >
                          no matrix
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          title="Edit"
                          onClick={() => openEdit(p)}
                          style={{
                            background: "#fff",
                            border: "1px solid #dee2e6",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            lineHeight: 1,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDelete(p)}
                          style={{
                            background: "#fff",
                            border: "1px solid #f5c6cb",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            lineHeight: 1,
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && positions.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #dee2e6",
                    background: "#f8f9fa",
                  }}
                >
                  <td
                    colSpan="3"
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    รวม {positions.length} ตำแหน่ง
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#0d6efd",
                    }}
                    title="รวมพนักงานทุกตำแหน่ง"
                  >
                    {totalWorkers}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
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
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "520px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "16px" }}>
                🧰 {editing ? "Edit Position" : "New Position"}
              </span>
              <button
                onClick={closeModal}
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

            {/* Body */}
            <div style={{ padding: "24px" }}>
              {error && (
                <div
                  style={{
                    background: "#f8d7da",
                    color: "#842029",
                    border: "1px solid #f5c6cb",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>
                  Position Name *{" "}
                  <span style={{ color: "#6c757d" }}>(canonical)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Welder, Regular"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Name (TH)</label>
                  <input
                    type="text"
                    placeholder="ชื่อภาษาไทย"
                    value={form.nameTH}
                    onChange={(e) =>
                      setForm({ ...form, nameTH: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>DEPARTMENT</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <input
                  type="checkbox"
                  id="posOffshore"
                  checked={form.isOffshore}
                  onChange={(e) =>
                    setForm({ ...form, isOffshore: e.target.checked })
                  }
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label
                  htmlFor="posOffshore"
                  style={{ fontSize: "13px", cursor: "pointer" }}
                >
                  ตำแหน่งนี้เป็นสาย offshore (ลงแท่นกลางทะเล)
                </label>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={closeModal}
                disabled={saving}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#0d6efd",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
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
