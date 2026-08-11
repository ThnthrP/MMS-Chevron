import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

const TABS = [
  { key: "inProgress", label: "🟢 กำลังดำเนินการ" },
  { key: "upcoming", label: "🔵 กำลังจะเริ่ม" },
  { key: "completed", label: "⚪ จบแล้ว" },
];

export default function SupervisorOverview() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inProgress");
  const [expandedProjects, setExpandedProjects] = useState({});

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/supervisor/projects-overview`, {
        withCredentials: true,
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  const toggleExpand = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  if (loading) return <div className="p-4 text-muted">Loading...</div>;
  if (!data)
    return <div className="p-4 text-muted">ไม่สามารถโหลดข้อมูลได้</div>;

  const projects = data[activeTab] || [];

  return (
    <div className="container-fluid p-0">
      <div style={{ width: "100%" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📊</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Projects Overview
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d", marginTop: "4px" }}>
            ภาพรวมโปรเจกต์ทั้งหมด — สถานะ, การจัดหาพนักงาน, และตารางเข้า-ออกงาน
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "1.5rem",
            borderBottom: "1px solid #dee2e6",
          }}
        >
          {TABS.map((tab) => {
            const count = data[tab.key]?.length ?? 0;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                  border: "none",
                  borderBottom: active
                    ? "2px solid #0d6efd"
                    : "2px solid transparent",
                  background: "none",
                  cursor: "pointer",
                  color: active ? "#0d6efd" : "#6c757d",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {tab.label}
                <span
                  style={{
                    background: active ? "#0d6efd" : "#e9ecef",
                    color: active ? "#fff" : "#6c757d",
                    borderRadius: "10px",
                    padding: "1px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "#6c757d",
              fontSize: "13px",
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
            }}
          >
            ไม่มีโปรเจกต์ในหมวดนี้
          </div>
        ) : (
          projects.map((p) => {
            const isExpanded = !!expandedProjects[p.id];
            const totalNeed = p.requests.reduce((s, r) => s + r.quantity, 0);
            const totalShortlisted = p.requests.reduce(
              (s, r) => s + r.shortlisted,
              0,
            );
            const overallPct =
              totalNeed > 0
                ? Math.round((totalShortlisted / totalNeed) * 100)
                : 0;

            return (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  border: "1px solid #dee2e6",
                  borderRadius: "10px",
                  marginBottom: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: "15px" }}>
                        {p.name}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${p.id}`);
                        }}
                        style={{
                          fontSize: "11px",
                          color: "#0d6efd",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        ดู Project →
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6c757d",
                        marginTop: "4px",
                      }}
                    >
                      {p.client || "—"}
                      {p.location ? ` · ${p.location}` : ""}
                      {" · "}
                      Start: {fmtDate(p.startDate)}
                      {p.endDate ? ` · End: ${fmtDate(p.endDate)}` : ""}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6c757d",
                          marginBottom: "4px",
                        }}
                      >
                        Shortlisted {totalShortlisted}/{totalNeed} ({overallPct}
                        %)
                      </div>
                      <div
                        style={{
                          background: "#e9ecef",
                          borderRadius: "4px",
                          height: "6px",
                          width: "140px",
                        }}
                      >
                        <div
                          style={{
                            background:
                              overallPct === 100 ? "#198754" : "#0d6efd",
                            borderRadius: "4px",
                            height: "6px",
                            width: `${overallPct}%`,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: "18px", color: "#6c757d" }}>
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid #f1f3f5",
                      padding: "16px 20px",
                      background: "#fafbfc",
                    }}
                  >
                    {/* Requirements */}
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#495057",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        Position Requirements
                      </div>
                      {p.requests.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#adb5bd" }}>
                          — ยังไม่มี position request
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(220px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          {p.requests.map((r) => (
                            <div
                              key={r.id}
                              style={{
                                background: "#fff",
                                border: "1px solid #e9ecef",
                                borderRadius: "8px",
                                padding: "10px 12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  marginBottom: "6px",
                                }}
                              >
                                {r.position} × {r.quantity}
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#6c757d",
                                  display: "flex",
                                  gap: "10px",
                                  marginBottom: "6px",
                                }}
                              >
                                <span>Shortlisted: {r.shortlisted}</span>
                                <span style={{ color: "#198754" }}>
                                  Approved: {r.approved}
                                </span>
                                {r.remaining > 0 && (
                                  <span style={{ color: "#dc3545" }}>
                                    ขาด: {r.remaining}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  background: "#e9ecef",
                                  borderRadius: "4px",
                                  height: "5px",
                                }}
                              >
                                <div
                                  style={{
                                    background:
                                      r.shortlistedPct === 100
                                        ? "#198754"
                                        : "#0d6efd",
                                    borderRadius: "4px",
                                    height: "5px",
                                    width: `${r.shortlistedPct}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Employee timeline */}
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#495057",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        Timeline พนักงาน ({p.employees.length} คน)
                      </div>
                      {p.employees.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#adb5bd" }}>
                          — ยังไม่มีพนักงานถูก mobilize เข้า project นี้
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "12px",
                            }}
                          >
                            <thead>
                              <tr style={{ background: "#f1f3f5" }}>
                                {[
                                  "NAME",
                                  "POSITION REQUESTED",
                                  "MOB DATE",
                                  "D-MOB DATE",
                                  "PLATFORM",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    style={{
                                      padding: "6px 10px",
                                      textAlign: "left",
                                      fontWeight: 700,
                                      color: "#6c757d",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {p.employees.map((e, i) => (
                                <tr
                                  key={`${e.employeeId}-${i}`}
                                  style={{ borderTop: "1px solid #f1f3f5" }}
                                >
                                  <td style={{ padding: "8px 10px" }}>
                                    <div style={{ fontWeight: 600 }}>
                                      {e.fullName}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "#6c757d",
                                      }}
                                    >
                                      {e.empCode}
                                      {e.employeePosition
                                        ? ` · ${e.employeePosition}`
                                        : ""}
                                    </div>
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    {e.requestedPosition || "—"}
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    {fmtDate(e.mobDate)}
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    {fmtDate(e.demobDate)}
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    {e.platform || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
