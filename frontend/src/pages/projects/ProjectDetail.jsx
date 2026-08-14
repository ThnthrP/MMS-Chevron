import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";

// ── role badge tones (เอาสไตล์เดียวกับ AdminUsers.jsx) ──
const ROLE_TONE = {
  admin: { bg: "#ede7f6", color: "#5e35b1" },
  manpower: { bg: "#e3f2fd", color: "#1565c0" },
  pe: { bg: "#fff3e0", color: "#e65100" },
  pe_head: { bg: "#fff3e0", color: "#e65100" },
  hr: { bg: "#e0f2f1", color: "#00695c" },
};
const roleTone = (name) =>
  ROLE_TONE[(name || "").toLowerCase()] || { bg: "#f1f3f5", color: "#6c757d" };

const FILE_ICON = {
  pdf: "📄",
  xlsx: "📊",
  xls: "📊",
  doc: "📝",
  docx: "📝",
  png: "🖼",
  jpg: "🖼",
  jpeg: "🖼",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { backendUrl, userData } = useContext(AppContent);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManageProjects = ["admin", "pe"].includes(userData?.role?.name);
  const canDiscuss = ["admin", "pe", "pe_head", "manpower"].includes(
    userData?.role?.name,
  );

  const [showAddPosition, setShowAddPosition] = useState(false);
  const [positions, setPositions] = useState([]);

  // ── Discussion state ──
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newFiles, setNewFiles] = useState([]);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0); // กัน flicker ตอนลากผ่าน child element

  const [sending, setSending] = useState(false);
  const discussionRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [selectedPositionIds, setSelectedPositionIds] = useState([]);
  const [savingPositions, setSavingPositions] = useState(false);

  // ── แก้ headcount แบบ inline ──
  const [quantityDraft, setQuantityDraft] = useState({}); // { requestId: quantity }
  const [savingQuantityId, setSavingQuantityId] = useState(null);

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

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const res = await axios.get(`${backendUrl}/api/project-messages/${id}`, {
        withCredentials: true,
      });
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchPositions();
    if (canDiscuss) fetchMessages();
  }, [id]);

  // ── auto-scroll ไป discussion section ถ้ามี ?tab=discussion ──
  useEffect(() => {
    if (searchParams.get("tab") === "discussion" && discussionRef.current) {
      setTimeout(() => {
        discussionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [searchParams, messagesLoading]);

  // ── auto-scroll ไปข้อความล่าสุดตอนโหลด/ส่งเสร็จ ──
  useEffect(() => {
    if (!messagesLoading) {
      messagesEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages, messagesLoading]);

  // ── กัน browser เปิดไฟล์เป็นแท็บใหม่เวลาลากไฟล์พลาดไม่ตรงกล่อง ──
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("drop", preventDefaults);
    return () => {
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("drop", preventDefaults);
    };
  }, []);

  useEffect(() => {
    if (project?.requests) {
      const draft = {};
      project.requests.forEach((r) => (draft[r.id] = r.quantity));
      setQuantityDraft(draft);
    }
  }, [project]);

  if (loading) return <div className="p-4 text-muted">Loading...</div>;
  if (!project) return <div className="p-4 text-muted">Project not found</div>;

  const totalHeadcount =
    project.requests?.reduce((sum, r) => sum + (r.quantity || 0), 0) ?? 0;
  const totalAssigned = project.assignments?.length ?? 0;
  const totalMobilized =
    project.assignments?.filter(
      (a) => a.status === "active" || a.status === "completed",
    ).length ?? 0;

  const hasCounts = positions.some((p) => p._count);

  // ── กันเลือกตำแหน่งที่มี Position Request อยู่แล้วในโปรเจกต์นี้ซ้ำ ──
  const existingPositionIds = new Set(
    (project.requests || []).map((r) => r.position?.id).filter(Boolean),
  );

  const selectablePositions = (
    hasCounts
      ? positions.filter((p) => (p._count?.employees ?? 0) > 0)
      : positions
  ).filter((p) => !existingPositionIds.has(p.id));

  const positionOptions = selectablePositions.map((p) => ({
    value: p.id,
    label: `${p.name}${p._count ? ` (${p._count.employees})` : ""}`,
  }));

  const handleAddPositions = async () => {
    if (selectedPositionIds.length === 0) return;
    try {
      setSavingPositions(true);
      await Promise.all(
        selectedPositionIds.map((positionId) =>
          axios.post(
            `${backendUrl}/api/projects/${id}/requests`,
            { positionId, quantity: 1 }, // default = 1 คน — ไปปรับต่อในตาราง
            { withCredentials: true },
          ),
        ),
      );
      setShowAddPosition(false);
      setSelectedPositionIds([]);
      fetchProject();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "เพิ่ม position ไม่สำเร็จ");
    } finally {
      setSavingPositions(false);
    }
  };

  const handleSaveQuantity = async (reqId) => {
    const newQty = quantityDraft[reqId];
    if (!newQty || Number(newQty) < 1) return;
    try {
      setSavingQuantityId(reqId);
      await axios.put(
        `${backendUrl}/api/projects/${id}/requests/${reqId}`,
        { quantity: Number(newQty) },
        { withCredentials: true },
      );
      fetchProject();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "แก้ headcount ไม่สำเร็จ");
    } finally {
      setSavingQuantityId(null);
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

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    setNewFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const handleFileSelect = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // จำเป็น — ไม่งั้น onDrop จะไม่ทำงาน
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeSelectedFile = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSendMessage = async () => {
    if (!newContent.trim() && newFiles.length === 0) return;
    try {
      setSending(true);
      const formData = new FormData();
      formData.append("content", newContent);
      newFiles.forEach((f) => formData.append("files", f));

      await axios.post(`${backendUrl}/api/project-messages/${id}`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setNewContent("");
      setNewFiles([]);
      fetchMessages();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const fmtDateTime = (d) =>
    new Date(d).toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmtDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "—");

  // ── styles ที่ใช้ซ้ำ ──
  const card = {
    background: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
    overflow: "hidden",
  };
  const cardHeader = {
    padding: "12px 18px",
    borderBottom: "1px solid #dee2e6",
    fontWeight: 700,
    fontSize: "13px",
  };

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Back + Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            onClick={() => navigate("/projects")}
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

        {/* ══════════════ Layout 2 คอลัมน์ ══════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          {/* ═══════════ คอลัมน์ซ้าย (กว้าง) ═══════════ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              minWidth: 0,
            }}
          >
            {/* Position Requests */}
            <div style={card}>
              <div
                style={{
                  ...cardHeader,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Position Requests</span>
                {canManageProjects && (
                  <button
                    onClick={() => setShowAddPosition(true)}
                    style={{
                      background: "#0d6efd",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Add Position
                  </button>
                )}
              </div>
              <div style={{ padding: "0" }}>
                {!project.requests || project.requests.length === 0 ? (
                  <div
                    style={{
                      padding: "28px",
                      textAlign: "center",
                      color: "#6c757d",
                      fontSize: "12px",
                    }}
                  >
                    No position requests yet — click + Add Position to get
                    started
                  </div>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12px",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f8f9fa" }}>
                        {[
                          "POSITION",
                          "HEADCOUNT",
                          "ASSIGNED",
                          "STATUS",
                          ...(canManageProjects ? [""] : []),
                        ].map((h, hi) => (
                          <th
                            key={hi}
                            style={{
                              padding: "8px 16px",
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "#6c757d",
                              letterSpacing: "0.4px",
                              textAlign: h === "" ? "center" : "left",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {project.requests.map((r) => (
                        <tr
                          key={r.id}
                          style={{ borderTop: "1px solid #f1f3f5" }}
                        >
                          <td style={{ padding: "8px 16px", fontWeight: 600 }}>
                            {r.position?.name || "—"}
                          </td>
                          <td style={{ padding: "8px 16px" }}>
                            {canManageProjects ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <input
                                  type="number"
                                  min="1"
                                  value={quantityDraft[r.id] ?? r.quantity}
                                  onChange={(e) =>
                                    setQuantityDraft((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  style={{
                                    width: "54px",
                                    padding: "3px 6px",
                                    fontSize: "12px",
                                    border: "1px solid #dee2e6",
                                    borderRadius: "6px",
                                  }}
                                />
                                {Number(quantityDraft[r.id]) !== r.quantity && (
                                  <button
                                    onClick={() => handleSaveQuantity(r.id)}
                                    disabled={savingQuantityId === r.id}
                                    title="บันทึก headcount"
                                    style={{
                                      background: "#198754",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "6px",
                                      padding: "3px 8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {savingQuantityId === r.id ? "..." : "✓"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              r.quantity
                            )}
                          </td>
                          <td style={{ padding: "8px 16px" }}>
                            {r.bookings?.length ?? 0} / {r.quantity}
                          </td>
                          <td style={{ padding: "8px 16px" }}>
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
                                padding: "2px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {r.status || "draft"}
                            </span>
                          </td>
                          {canManageProjects && (
                            <td
                              style={{
                                padding: "8px 16px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                title="ลบ position request"
                                onClick={() =>
                                  handleDeleteRequest(
                                    r.id,
                                    r.position?.name || "",
                                  )
                                }
                                style={{
                                  background: "#fff",
                                  border: "1px solid #f5c6cb",
                                  borderRadius: "6px",
                                  padding: "3px 7px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  lineHeight: 1,
                                }}
                              >
                                🗑
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ════════ Employee Timeline (จัดกลุ่มตาม Position Requested) ════════ */}
            <div style={card}>
              <div style={cardHeader}>
                Employee Timeline ({project.assignments?.length ?? 0} คน)
              </div>
              <div style={{ padding: "0" }}>
                {!project.assignments || project.assignments.length === 0 ? (
                  <div
                    style={{
                      padding: "28px",
                      textAlign: "center",
                      color: "#6c757d",
                      fontSize: "12px",
                    }}
                  >
                    ยังไม่มีพนักงานถูก mobilize เข้าโปรเจกต์นี้
                  </div>
                ) : (
                  (() => {
                    // ── หา "requested position" ต่อ employeeId จาก requests[].bookings[] ──
                    const requestedPositionByEmp = new Map();
                    (project.requests || []).forEach((r) => {
                      (r.bookings || []).forEach((b) => {
                        if (b.employeeId) {
                          requestedPositionByEmp.set(
                            b.employeeId,
                            r.position?.name || null,
                          );
                        }
                      });
                    });

                    // ── จัดกลุ่ม assignments ตาม requested position ──
                    //    ลำดับกลุ่ม = ลำดับเดียวกับ project.requests (ให้ตรงกับ card ด้านบน)
                    const groups = new Map(); // positionName -> assignments[]
                    const ungrouped = [];

                    project.assignments.forEach((a) => {
                      const pos = requestedPositionByEmp.get(a.employeeId);
                      if (pos) {
                        if (!groups.has(pos)) groups.set(pos, []);
                        groups.get(pos).push(a);
                      } else {
                        ungrouped.push(a);
                      }
                    });

                    // เรียงกลุ่มตามลำดับ position ใน requests ก่อน ตามด้วยกลุ่มที่หา request ไม่เจอ (ถ้ามี)
                    const orderedPositionNames = (project.requests || [])
                      .map((r) => r.position?.name)
                      .filter((name) => name && groups.has(name));
                    const remainingNames = [...groups.keys()].filter(
                      (name) => !orderedPositionNames.includes(name),
                    );
                    const orderedGroups = [
                      ...orderedPositionNames,
                      ...remainingNames,
                    ].map((name) => [name, groups.get(name)]);

                    const renderTable = (rows) => (
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            {["NAME", "MOB DATE", "D-MOB DATE", "PLATFORM"].map(
                              (h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "6px 16px",
                                    textAlign: "left",
                                    fontWeight: 600,
                                    color: "#6c757d",
                                    fontSize: "10px",
                                    letterSpacing: "0.4px",
                                  }}
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((a) => {
                            const employeePosition =
                              a.employee?.position?.name || "";
                            return (
                              <tr
                                key={a.id}
                                style={{ borderTop: "1px solid #f1f3f5" }}
                              >
                                <td style={{ padding: "6px 16px" }}>
                                  <div style={{ fontWeight: 600 }}>
                                    {a.employee?.fullName || "—"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#6c757d",
                                    }}
                                  >
                                    {a.employee?.empCode || ""}
                                    {employeePosition
                                      ? ` · ${employeePosition}`
                                      : ""}
                                  </div>
                                </td>
                                <td style={{ padding: "6px 16px" }}>
                                  {fmtDate(a.mobDate)}
                                </td>
                                <td style={{ padding: "6px 16px" }}>
                                  {fmtDate(a.demobDate)}
                                </td>
                                <td style={{ padding: "6px 16px" }}>
                                  {a.platform || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );

                    return (
                      <div>
                        {orderedGroups.map(([posName, rows]) => (
                          <div
                            key={posName}
                            style={{ borderTop: "1px solid #f1f3f5" }}
                          >
                            <div
                              style={{
                                padding: "8px 16px",
                                background: "#fafbfc",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#495057",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>{posName}</span>
                              <span
                                style={{ color: "#6c757d", fontWeight: 500 }}
                              >
                                {rows.length} คน
                              </span>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              {renderTable(rows)}
                            </div>
                          </div>
                        ))}

                        {ungrouped.length > 0 && (
                          <div style={{ borderTop: "1px solid #f1f3f5" }}>
                            <div
                              style={{
                                padding: "8px 16px",
                                background: "#fafbfc",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#adb5bd",
                              }}
                            >
                              ไม่พบ Position Request ที่ตรงกัน (
                              {ungrouped.length} คน)
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              {renderTable(ungrouped)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* ════════ Discussion — PE ↔ MP ════════ */}
            {canDiscuss && (
              <div
                ref={discussionRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  ...card,
                  border: isDragging
                    ? "2px dashed #0d6efd"
                    : "1px solid #dee2e6",
                  position: "relative",
                  transition: "border 0.15s",
                }}
              >
                {isDragging && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(13,110,253,0.08)",
                      color: "#0d6efd",
                      fontSize: "15px",
                      fontWeight: 700,
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  >
                    📎 วางไฟล์ตรงนี้เพื่อแนบ
                  </div>
                )}
                <div
                  style={{
                    ...cardHeader,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "15px" }}>💬</span>
                  <span>Discussion — PE ↔ Manpower</span>
                  <span style={{ fontSize: "10px", color: "#adb5bd" }}>
                    (ส่งไฟล์ CV/Roster/Skill Matrix และคุยผลจากลูกค้าที่นี่ —
                    ลากไฟล์มาวางในกล่องนี้ หรือกด 📎 เพื่อแนบ)
                  </span>
                </div>

                {/* Messages list */}
                <div
                  style={{
                    padding: "14px 18px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    background: "#fafbfc",
                  }}
                >
                  {messagesLoading ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#6c757d",
                        padding: "18px",
                        fontSize: "12px",
                      }}
                    >
                      Loading...
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#adb5bd",
                        padding: "20px",
                        fontSize: "12px",
                      }}
                    >
                      ยังไม่มีข้อความ — เริ่มพิมพ์ด้านล่าง
                      หรือลากไฟล์มาวางในกล่องนี้ได้เลย 📎
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender?.id === userData?.id;
                      const tone = roleTone(m.sender?.role?.name);
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isMine ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "3px",
                              flexDirection: isMine ? "row-reverse" : "row",
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: "11px" }}>
                              {m.sender?.name || "—"}
                            </span>
                            <span
                              style={{
                                background: tone.bg,
                                color: tone.color,
                                borderRadius: "5px",
                                padding: "1px 6px",
                                fontSize: "9px",
                                fontWeight: 700,
                                textTransform: "capitalize",
                              }}
                            >
                              {m.sender?.role?.name || "—"}
                            </span>
                            <span style={{ fontSize: "9px", color: "#adb5bd" }}>
                              {fmtDateTime(m.createdAt)}
                            </span>
                          </div>

                          <div
                            style={{
                              maxWidth: "75%",
                              background: isMine ? "#0d6efd" : "#fff",
                              color: isMine ? "#fff" : "#212529",
                              border: isMine ? "none" : "1px solid #e9ecef",
                              borderRadius: "10px",
                              padding: "8px 12px",
                            }}
                          >
                            {m.content && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  whiteSpace: "pre-wrap",
                                  marginBottom:
                                    m.attachments?.length > 0 ? "6px" : 0,
                                }}
                              >
                                {m.content}
                              </div>
                            )}
                            {m.attachments?.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "5px",
                                }}
                              >
                                {m.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={`${backendUrl}${att.filePath}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      padding: "5px 8px",
                                      background: isMine
                                        ? "rgba(255,255,255,0.15)"
                                        : "#f1f3f5",
                                      borderRadius: "6px",
                                      fontSize: "11px",
                                      color: isMine ? "#fff" : "#0d6efd",
                                      textDecoration: "none",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <span>
                                      {FILE_ICON[att.fileType] || "📎"}
                                    </span>
                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {att.fileName}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div
                  style={{
                    padding: "12px 18px",
                    borderTop: "1px solid #dee2e6",
                  }}
                >
                  {newFiles.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      {newFiles.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#e9ecef",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "11px",
                          }}
                        >
                          📎 {f.name}
                          <button
                            onClick={() => removeSelectedFile(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              fontSize: "11px",
                              padding: 0,
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-end",
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={newFiles.length >= 5}
                      title="แนบไฟล์ (สูงสุด 5 ไฟล์)"
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #dee2e6",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        fontSize: "15px",
                        cursor:
                          newFiles.length >= 5 ? "not-allowed" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      📎
                    </button>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                      rows={1}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "12px",
                        border: "1px solid #dee2e6",
                        borderRadius: "8px",
                        outline: "none",
                        resize: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={
                        sending || (!newContent.trim() && newFiles.length === 0)
                      }
                      style={{
                        background:
                          sending ||
                          (!newContent.trim() && newFiles.length === 0)
                            ? "#adb5bd"
                            : "#0d6efd",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor:
                          sending ||
                          (!newContent.trim() && newFiles.length === 0)
                            ? "not-allowed"
                            : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {sending ? "..." : "ส่ง"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ คอลัมน์ขวา (แคบ, sticky) ═══════════ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              position: "sticky",
              top: "20px",
            }}
          >
            {/* General Information — แบบย่อ */}
            <div style={card}>
              <div style={cardHeader}>General Information</div>
              <div style={{ padding: "10px 18px" }}>
                {[
                  ["Client", project.contract?.client?.name],
                  ["Contract", project.contract?.name],
                  ["Location", project.location],
                  ["Start", fmtDate(project.startDate)],
                  ["End", fmtDate(project.endDate)],
                  ["Offshore", project.isOffshore ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid #f1f3f5",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#6c757d", flexShrink: 0 }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {value || "—"}
                    </span>
                  </div>
                ))}
                {project.notes && (
                  <div style={{ marginTop: "8px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#6c757d",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Notes
                    </div>
                    <div style={{ fontSize: "12px", color: "#495057" }}>
                      {project.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Allocation + Mobilization — รวมในการ์ดเดียว */}
            <div style={card}>
              <div style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#6c757d" }}>
                    Allocation
                  </span>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#0d6efd",
                    }}
                  >
                    {totalAssigned}/{totalHeadcount}
                  </span>
                </div>
                <button
                  onClick={() =>
                    navigate(`/allocation?projectId=${project.id}`)
                  }
                  style={{
                    width: "100%",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "6px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    background: "#f8f9fa",
                    cursor: "pointer",
                    marginBottom: "14px",
                  }}
                >
                  Go to Allocation →
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "4px",
                    paddingTop: "12px",
                    borderTop: "1px solid #f1f3f5",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#6c757d" }}>
                    Mobilization
                  </span>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#198754",
                    }}
                  >
                    {totalMobilized}/{totalAssigned}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/mobilization")}
                  style={{
                    width: "100%",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "6px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    background: "#f8f9fa",
                    cursor: "pointer",
                  }}
                >
                  Go to Mobilization →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Position Modal */}
      {showAddPosition && canManageProjects && (
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
              maxWidth: "700px",
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
                onClick={() => {
                  setShowAddPosition(false);
                  setSelectedPositionIds([]);
                }}
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

            <div style={{ padding: "24px" }}>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                Position * (เลือกได้หลายตำแหน่ง —{" "}
                <span style={{ color: "#6c757d", fontWeight: 400 }}>
                  เฉพาะตำแหน่งที่มีพนักงาน และยังไม่มีใน request ของโปรเจกต์นี้
                </span>
                )
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  gap: "20px",
                  alignItems: "start",
                }}
              >
                {/* ── ฝั่งซ้าย: ช่องค้นหา/dropdown ── */}
                <div>
                  <Select
                    isMulti
                    options={positionOptions}
                    value={positionOptions.filter((o) =>
                      selectedPositionIds.includes(o.value),
                    )}
                    onChange={(selected) =>
                      setSelectedPositionIds(
                        (selected || []).map((o) => o.value),
                      )
                    }
                    placeholder="ค้นหา / เลือกตำแหน่ง..."
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    hideSelectedOptions={false}
                    closeMenuOnSelect={false}
                    components={{
                      MultiValue: () => null,
                    }}
                    styles={{
                      menuPortal: (b) => ({ ...b, zIndex: 1000000 }),
                      control: (b) => ({
                        ...b,
                        fontSize: "13px",
                        minHeight: "38px",
                      }),
                      option: (b) => ({ ...b, fontSize: "13px" }),
                      valueContainer: (b) => ({ ...b, flexWrap: "nowrap" }),
                    }}
                    noOptionsMessage={() =>
                      hasCounts
                        ? "ไม่มีตำแหน่งที่มีพนักงาน หรือทุกตำแหน่งถูกเพิ่มแล้ว"
                        : "ไม่มีตำแหน่ง"
                    }
                  />

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#adb5bd",
                      marginTop: "10px",
                    }}
                  >
                    Headcount เริ่มต้น = 1 คนต่อตำแหน่ง
                    ปรับได้ในตารางหลังเพิ่มแล้ว
                  </div>
                </div>

                {/* ── ฝั่งขวา: รายการที่เลือกแล้ว — อยู่คนละตำแหน่งกับ dropdown เลยไม่โดนทับ ── */}
                <div
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    padding: "10px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    background: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6c757d",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    เลือกแล้ว ({selectedPositionIds.length})
                  </div>
                  {selectedPositionIds.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#adb5bd" }}>
                      ยังไม่ได้เลือก
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {selectedPositionIds.map((posId) => {
                        const opt = positionOptions.find(
                          (o) => o.value === posId,
                        );
                        if (!opt) return null;
                        return (
                          <div
                            key={posId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                              background: "#e7f1ff",
                              color: "#0d6efd",
                              borderRadius: "6px",
                              padding: "5px 8px",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {opt.label}
                            </span>
                            <button
                              onClick={() =>
                                setSelectedPositionIds((prev) =>
                                  prev.filter((id) => id !== posId),
                                )
                              }
                              style={{
                                background: "none",
                                border: "none",
                                color: "#0d6efd",
                                cursor: "pointer",
                                fontSize: "13px",
                                padding: 0,
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                onClick={() => {
                  setShowAddPosition(false);
                  setSelectedPositionIds([]);
                }}
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
                onClick={handleAddPositions}
                disabled={selectedPositionIds.length === 0 || savingPositions}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    selectedPositionIds.length === 0 || savingPositions
                      ? "#adb5bd"
                      : "#0d6efd",
                  color: "#fff",
                  fontWeight: 600,
                  cursor:
                    selectedPositionIds.length === 0 || savingPositions
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {savingPositions
                  ? "Saving..."
                  : `Save (${selectedPositionIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
