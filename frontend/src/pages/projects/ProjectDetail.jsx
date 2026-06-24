import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddPosition, setShowAddPosition] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionForm, setPositionForm] = useState({
    positionId: "",
    quantity: 1,
  });

  const fetchProject = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/projects/${id}`, {
        withCredentials: true,
      });
      setProject(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ใช้ /manage เพื่อให้ได้ _count.employees → กรองเฉพาะตำแหน่งที่มีพนักงาน
  // ถ้า /manage ใช้ไม่ได้ (role) fallback /api/positions (โชว์ทั้งหมด)
  const fetchPositions = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/positions/manage`, {
        withCredentials: true,
      });
      setPositions(res.data);
    } catch {
      try {
        const res2 = await axios.get(`${backendUrl}/api/positions`, {
          withCredentials: true,
        });
        setPositions(res2.data);
      } catch (e2) {
        console.error(e2);
      }
    }
  };

  useEffect(() => {
    fetchProject();
    fetchPositions();
  }, [id]);

  if (loading) return <div className="p-4 text-muted">Loading...</div>;
  if (!project) return <div className="p-4 text-muted">Project not found</div>;

  const totalHeadcount =
    project.requests?.reduce((sum, r) => sum + (r.quantity || 0), 0) ?? 0;
  const totalAssigned = project.assignments?.length ?? 0;
  const totalMobilized =
    project.assignments?.filter(
      (a) => a.status === "active" || a.status === "completed",
    ).length ?? 0;

  // ── ตัวเลือกตำแหน่งสำหรับ modal — เฉพาะที่มีพนักงาน + ค้นหาได้ ──
  const hasCounts = positions.some((p) => p._count);
  const selectablePositions = hasCounts
    ? positions.filter((p) => (p._count?.employees ?? 0) > 0)
    : positions;
  const positionOptions = selectablePositions.map((p) => ({
    value: p.id,
    label: `${p.name}${p._count ? ` (${p._count.employees})` : ""}`,
  }));

  const handleAddPosition = async () => {
    if (!positionForm.positionId) return;
    try {
      await axios.post(
        `${backendUrl}/api/projects/${id}/requests`,
        {
          positionId: positionForm.positionId,
          quantity: Number(positionForm.quantity),
        },
        { withCredentials: true },
      );
      setShowAddPosition(false);
      setPositionForm({ positionId: "", quantity: 1 });
      fetchProject();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "เพิ่ม position ไม่สำเร็จ");
    }
  };

  const handleDeleteRequest = async (reqId, name) => {
    if (!confirm(`ลบ position request "${name}" ?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/projects/${id}/requests/${reqId}`, {
        withCredentials: true,
      });
      fetchProject();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message ||
          "ลบไม่ได้ — อาจมี shortlist/booking ผูกอยู่ หรือ backend ยังไม่มี route นี้",
      );
    }
  };

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Back + Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#6c757d",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0,
              marginBottom: "8px",
            }}
          >
            ← Back to Projects
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: "4px" }}>
                {project.name}
              </h4>
              <span style={{ fontSize: "13px", color: "#6c757d" }}>
                {project.contract?.client?.name} — {project.contract?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: General Information */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #dee2e6",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            General Information
          </div>
          <div
            style={{
              padding: "20px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
            }}
          >
            {[
              { label: "Client", value: project.contract?.client?.name || "—" },
              { label: "Contract", value: project.contract?.name || "—" },
              { label: "Location / Site", value: project.location || "—" },
              {
                label: "Start Date",
                value: project.startDate
                  ? new Date(project.startDate).toISOString().split("T")[0]
                  : "—",
              },
              {
                label: "End Date",
                value: project.endDate
                  ? new Date(project.endDate).toISOString().split("T")[0]
                  : "—",
              },
              { label: "Offshore", value: project.isOffshore ? "Yes" : "No" },
            ].map((item) => (
              <div key={item.label}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>
                  {item.value}
                </div>
              </div>
            ))}
            {project.notes && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}
                >
                  Notes
                </div>
                <div style={{ fontSize: "13px", color: "#495057" }}>
                  {project.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Position Requests */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #dee2e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "14px" }}>
              Position Requests
            </span>
            <button
              onClick={() => setShowAddPosition(true)}
              style={{
                background: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Position
            </button>
          </div>
          <div style={{ padding: "0" }}>
            {!project.requests || project.requests.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: "13px",
                }}
              >
                No position requests yet — click + Add Position to get started
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    {["POSITION", "HEADCOUNT", "ASSIGNED", "STATUS", ""].map(
                      (h, hi) => (
                        <th
                          key={hi}
                          style={{
                            padding: "10px 20px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#6c757d",
                            letterSpacing: "0.5px",
                            textAlign: h === "" ? "center" : "left",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {project.requests.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 600 }}>
                        {r.position?.name || "—"}
                      </td>
                      <td style={{ padding: "12px 20px" }}>{r.quantity}</td>
                      <td style={{ padding: "12px 20px" }}>
                        {r.bookings?.length ?? 0} / {r.quantity}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            background:
                              r.status === "deployed"
                                ? "#d1e7dd"
                                : r.status === "approved" ||
                                    r.status === "booked"
                                  ? "#cff4fc"
                                  : "#e9ecef",
                            color:
                              r.status === "deployed"
                                ? "#0f5132"
                                : r.status === "approved" ||
                                    r.status === "booked"
                                  ? "#055160"
                                  : "#495057",
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {r.status || "draft"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", textAlign: "center" }}>
                        <button
                          title="ลบ position request"
                          onClick={() =>
                            handleDeleteRequest(r.id, r.position?.name || "")
                          }
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 3 & 4: Allocation + Mobilization Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          {/* Allocation Summary */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #dee2e6",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              Allocation
            </div>
            <div style={{ padding: "20px" }}>
              <div
                style={{ fontSize: "28px", fontWeight: 700, color: "#0d6efd" }}
              >
                {totalAssigned} / {totalHeadcount}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#6c757d",
                  marginBottom: "16px",
                }}
              >
                Workers assigned
              </div>
              <button
                onClick={() => navigate("/allocation")}
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Go to Allocation →
              </button>
            </div>
          </div>

          {/* Mobilization Summary */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #dee2e6",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              Mobilization
            </div>
            <div style={{ padding: "20px" }}>
              <div
                style={{ fontSize: "28px", fontWeight: 700, color: "#198754" }}
              >
                {totalMobilized} / {totalAssigned}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#6c757d",
                  marginBottom: "16px",
                }}
              >
                Workers mobilized
              </div>
              <button
                onClick={() => navigate("/mobilization")}
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Go to Mobilization →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Position Modal */}
      {showAddPosition && (
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
              maxWidth: "480px",
              overflow: "visible",
            }}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTopLeftRadius: "10px",
                borderTopRightRadius: "10px",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "15px" }}>
                Add Position Request
              </span>
              <button
                onClick={() => setShowAddPosition(false)}
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
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Position *{" "}
                  <span style={{ color: "#6c757d", fontWeight: 400 }}>
                    (เฉพาะตำแหน่งที่มีพนักงาน)
                  </span>
                </label>
                <Select
                  options={positionOptions}
                  value={
                    positionOptions.find(
                      (o) => o.value === positionForm.positionId,
                    ) || null
                  }
                  onChange={(o) =>
                    setPositionForm({
                      ...positionForm,
                      positionId: o ? o.value : "",
                    })
                  }
                  placeholder="ค้นหา / เลือกตำแหน่ง..."
                  isClearable
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (b) => ({ ...b, zIndex: 1000000 }),
                    control: (b) => ({ ...b, fontSize: "13px" }),
                    option: (b) => ({ ...b, fontSize: "13px" }),
                  }}
                  noOptionsMessage={() =>
                    hasCounts ? "ไม่มีตำแหน่งที่มีพนักงาน" : "ไม่มีตำแหน่ง"
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Headcount *
                </label>
                <input
                  type="number"
                  min="1"
                  value={positionForm.quantity}
                  onChange={(e) =>
                    setPositionForm({
                      ...positionForm,
                      quantity: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

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
                onClick={() => setShowAddPosition(false)}
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
                onClick={handleAddPosition}
                disabled={!positionForm.positionId}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background: positionForm.positionId ? "#0d6efd" : "#adb5bd",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: positionForm.positionId ? "pointer" : "not-allowed",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
