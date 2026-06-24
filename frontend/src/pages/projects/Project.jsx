import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function Project() {
  const { backendUrl } = useContext(AppContent);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    name: "",
    contractId: "",
    location: "",
    notes: "",
    startDate: "",
    endDate: "",
  });

  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/projects`, {
        withCredentials: true,
      });
      setProjects(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/clients`, {
        withCredentials: true,
      });
      setClients(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    try {
      await axios.delete(`${backendUrl}/api/projects/${id}`, {
        withCredentials: true,
      });
      fetchProjects();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/projects`,
        {
          name: form.name,
          contractId: form.contractId,
          location: form.location || null,
          notes: form.notes || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        },
        { withCredentials: true },
      );
      setShowModal(false);
      setForm({
        name: "",
        contractId: "",
        location: "",
        notes: "",
        startDate: "",
        endDate: "",
      });
      fetchProjects();
    } catch (error) {
      console.error(error);
    }
  };

  const getHeadcount = (requests) => {
    const total = requests?.reduce((sum, r) => sum + (r.quantity || 0), 0) ?? 0;
    const booked =
      requests?.reduce((sum, r) => sum + (r.bookings?.length || 0), 0) ?? 0;
    return { booked, total };
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1.5rem",
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
              <span style={{ fontSize: "20px" }}>🗂</span>
              <span style={{ fontSize: "18px", fontWeight: 700 }}>
                Projects
              </span>
              <span
                style={{
                  background: "#e9f5fb",
                  color: "#0d6efd",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                Phase 3
              </span>
              <span style={{ color: "#6c757d", fontSize: "12px" }}>
                Step 7: Project Requests
              </span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              + New Project Request
            </button>
          </div>
        </div>

        {/* Table Card */}
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
                  "PROJECT",
                  "CLIENT",
                  "LOCATION",
                  "START DATE",
                  "END DATE",
                  "POSITIONS",
                  "ACTIONS",
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#6c757d",
                      letterSpacing: "0.5px",
                      textAlign: i >= 3 ? "center" : "left",
                      background: "#fff",
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
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    No projects found
                  </td>
                </tr>
              ) : (
                projects.map((p, idx) => {
                  const { total } = getHeadcount(p.requests);
                  const posCount = p.requests?.length ?? 0;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom:
                          idx < projects.length - 1
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
                      {/* PROJECT — ชื่อคลิกได้ */}
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          onClick={() => navigate(`/admin/projects/${p.id}`)}
                          style={{
                            fontWeight: 600,
                            color: "#0d6efd",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                          }
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          {p.contract?.name || "—"}
                        </div>
                      </td>

                      {/* CLIENT */}
                      <td style={{ padding: "14px 16px" }}>
                        {p.contract?.client?.name || "—"}
                      </td>

                      {/* LOCATION */}
                      <td style={{ padding: "14px 16px" }}>
                        {p.location || "—"}
                      </td>

                      {/* START DATE */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {p.startDate
                          ? new Date(p.startDate).toISOString().split("T")[0]
                          : "—"}
                      </td>

                      {/* END DATE */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {p.endDate
                          ? new Date(p.endDate).toISOString().split("T")[0]
                          : "—"}
                      </td>

                      {/* POSITIONS */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {posCount > 0 ? (
                          <span
                            style={{ fontSize: "13px", color: "#495057" }}
                            title={`${total} total headcount`}
                          >
                            {posCount} position{posCount > 1 ? "s" : ""}
                            <span style={{ color: "#6c757d" }}>
                              {" "}
                              · {total} HC
                            </span>
                          </span>
                        ) : (
                          <span
                            onClick={() => navigate(`/admin/projects/${p.id}`)}
                            style={{
                              fontSize: "12px",
                              color: "#664d03",
                              background: "#fff3cd",
                              borderRadius: "6px",
                              padding: "3px 10px",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                            title="ยังไม่มี position — คลิกเพื่อเพิ่ม"
                          >
                            No positions yet
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            title="Open project — manage positions & allocation"
                            onClick={() => navigate(`/admin/projects/${p.id}`)}
                            style={{
                              background: "#0d6efd",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 12px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Manage
                          </button>
                          <button
                            title="Edit"
                            onClick={() =>
                              navigate(`/admin/projects/${p.id}/edit`)
                            }
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
                            onClick={() => handleDelete(p.id)}
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
                  );
                })
              )}
            </tbody>
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
              maxWidth: "720px",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: 600,
                  fontSize: "16px",
                }}
              >
                🗂 Project Request
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {/* Project Name */}
                <div>
                  <label style={labelStyle}>Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Platform Alpha Turnaround"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                {/* Client */}
                <div>
                  <label style={labelStyle}>Client *</label>
                  <select
                    value={form.contractId}
                    onChange={(e) =>
                      setForm({ ...form, contractId: e.target.value })
                    }
                    style={{ ...inputStyle, background: "#fff" }}
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) =>
                      c.contracts?.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {c.name} — {ct.name}
                        </option>
                      )),
                    )}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label style={labelStyle}>Location / Site</label>
                  <input
                    type="text"
                    placeholder="e.g., Offshore Platform A"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                {/* Offshore */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingTop: "28px",
                  }}
                ></div>
              </div>

              {/* Notes */}
              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            {/* Modal Footer */}
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
                onClick={() => setShowModal(false)}
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
                onClick={handleSubmit}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#0d6efd",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
