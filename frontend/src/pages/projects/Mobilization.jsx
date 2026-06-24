import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";

const DEMOB_DAYS = 28;

// ── tones ──
const TONE = {
  ok: { bg: "#d1e7dd", color: "#0f5132" },
  warn: { bg: "#fff3cd", color: "#664d03" },
  danger: { bg: "#f8d7da", color: "#842029" },
  muted: { bg: "#f1f3f5", color: "#6c757d" },
  info: { bg: "#cfe2ff", color: "#084298" },
};

function Badge({ tone = "muted", children }) {
  const t = TONE[tone] ?? TONE.muted;
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── helpers ──
function ymd(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000));
}

function medicalFit(expiry) {
  if (!expiry) return { fit: false, label: "No record", tone: "muted" };
  const d = new Date(expiry);
  if (isNaN(d.getTime()))
    return { fit: false, label: "No record", tone: "muted" };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { fit: false, label: "Overdue", tone: "danger" };
  if (days <= 30) return { fit: true, label: "Due soon", tone: "warn" };
  return { fit: true, label: "Fit", tone: "ok" };
}

const STATUS_TONE = { pending: "warn", ready: "info", deployed: "ok" };
const STATUS_LABEL = {
  pending: "Pending",
  ready: "Ready",
  deployed: "Deployed",
};

export default function Mobilization() {
  const { backendUrl } = useContext(AppContent);

  const [projects, setProjects] = useState([]);
  //   const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "mob_projectId",
    "",
  );
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // dropdown — reuse allocation projects endpoint
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/allocation/projects`, { withCredentials: true })
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setRows([]);
      return;
    }
    fetchList(selectedProjectId);
  }, [selectedProjectId]);

  const fetchList = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/mobilization/${projectId}`,
        { withCredentials: true },
      );
      const data = res.data;
      setProject(data.project);
      setRows(buildRows(data));
    } catch (err) {
      console.error(err);
      setProject(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const buildRows = (data) => {
    const defaultMob = ymd(data.project.startDate);
    return data.workers.map((w) => {
      const asg = w.assignment;
      const deployed = !!asg;
      const mobDate = asg?.mobDate ? ymd(asg.mobDate) : defaultMob;
      return {
        ...w,
        // checklist (client-side gate; ถ้า deploy แล้วถือว่าผ่าน)
        ppe: deployed,
        safetyInduction: deployed,
        // deployment
        mobDate,
        platform: asg?.platform ?? "",
        deployed,
        deployedAt: asg?.createdAt ?? null, // ← Deployed on
      };
    });
  };

  // ── derived per row ──
  const isReady = (r) => {
    const med = medicalFit(r.medicalExpiry);
    return (
      r.ppe &&
      r.safetyInduction &&
      med.fit &&
      !!r.mobDate &&
      !!r.platform &&
      !r.deployed
    );
  };
  const rowStatus = (r) =>
    r.deployed ? "deployed" : isReady(r) ? "ready" : "pending";

  // ── update (client-side only จนกว่าจะกด deploy) ──
  const updateRow = (employeeId, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r)),
    );
  };

  // ── deploy ──
  const deploy = async (targets) => {
    if (!project || !targets.length) return;
    try {
      const res = await axios.post(
        `${backendUrl}/api/mobilization/deploy`,
        {
          projectId: project.id,
          deployments: targets.map((r) => ({
            employeeId: r.employeeId,
            mobDate: r.mobDate,
            platform: r.platform,
          })),
        },
        { withCredentials: true },
      );
      await fetchList(project.id);
      if (res.data?.deployed) {
        alert(`Deployed ${res.data.deployed} worker(s) to site ✓`);
      }
    } catch (err) {
      console.error(err);
      alert("Deploy failed — ดู console");
    }
  };

  const deployRow = (employeeId) => {
    const r = rows.find((x) => x.employeeId === employeeId);
    if (r && isReady(r)) deploy([r]);
  };
  const deployAllReady = () => deploy(rows.filter(isReady));

  // ── undeploy → ลบ assignment กลับเป็น pending ──
  const undeployRow = async (employeeId) => {
    if (!project) return;
    if (!window.confirm("ยกเลิกการ deploy คนนี้?")) return;
    try {
      await axios.post(
        `${backendUrl}/api/mobilization/undeploy`,
        { projectId: project.id, employeeId },
        { withCredentials: true },
      );
      await fetchList(project.id);
    } catch (err) {
      console.error(err);
      alert("Undeploy failed — ดู console");
    }
  };

  // ── remove from shortlist → เรียก unapprove เดิมของ Allocation ──
  //   คนนั้นกลับเป็น proposed → หลุดจาก Mobilization, ไป review ใหม่ที่ Allocation
  const removeFromShortlist = async (row) => {
    if (
      !window.confirm(
        `เอา ${row.fullName} ออกจาก shortlist? (กลับไปสถานะ proposed ใน Allocation)`,
      )
    )
      return;
    try {
      await axios.put(
        `${backendUrl}/api/allocation/unapprove`,
        { candidateIds: [row.candidateId], requestId: row.requestId },
        { withCredentials: true },
      );
      await fetchList(project.id);
    } catch (err) {
      console.error(err);
      alert("Remove failed — ดู console");
    }
  };

  const readyCount = useMemo(() => rows.filter(isReady).length, [rows]);
  const deployedCount = useMemo(
    () => rows.filter((r) => r.deployed).length,
    [rows],
  );

  // ── styles ──
  const card = {
    background: "#fff",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "16px",
  };
  const cardHead = {
    padding: "14px 18px",
    borderBottom: "1px solid #e9ecef",
    fontWeight: 700,
    fontSize: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  };
  const th = {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    borderBottom: "1px solid #e9ecef",
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "10px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #f1f3f5",
    verticalAlign: "middle",
  };
  const input = {
    border: "1px solid #ced4da",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    width: "100%",
    maxWidth: "140px",
  };
  const btnBase = {
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    background: "#fff",
  };
  const empty = {
    padding: "28px",
    textAlign: "center",
    color: "#6c757d",
    fontSize: "13px",
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px 4px" }}>
      {/* header */}
      <div style={card}>
        <div style={{ padding: "18px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>
            🚀 Mobilization
          </div>
          <div style={{ marginTop: "6px", fontSize: "12px", color: "#6c757d" }}>
            <span
              style={{
                background: "#e7e9ec",
                borderRadius: "6px",
                padding: "2px 8px",
                fontWeight: 700,
                marginRight: "8px",
              }}
            >
              Phase 4
            </span>
            Steps 10–11: Checklist → Deploy to Site
          </div>
        </div>
      </div>

      {/* project select */}
      <div style={{ ...card, padding: "16px 18px" }}>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "420px",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "14px",
          }}
        >
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {project && (
          <div
            style={{ marginTop: "10px", fontSize: "12px", color: "#6c757d" }}
          >
            Start (default MOB):{" "}
            <strong>{ymd(project.startDate) || "—"}</strong> · D-MOB = MOB +{" "}
            {DEMOB_DAYS} วัน
          </div>
        )}
      </div>

      {/* Step 10–11 table */}
      <div style={card}>
        <div style={cardHead}>
          <span>
            Step 10–11: Checklist (PPE · Safety Induction · Medical Fit) →
            Deploy
          </span>
          {project && rows.length > 0 && (
            <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge tone="ok">{deployedCount} deployed</Badge>
              <Badge tone="info">{readyCount} ready</Badge>
              <button
                onClick={deployAllReady}
                disabled={readyCount === 0}
                style={{
                  background: readyCount > 0 ? "#0f5132" : "#e9ecef",
                  color: readyCount > 0 ? "#fff" : "#adb5bd",
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: readyCount > 0 ? "pointer" : "not-allowed",
                }}
              >
                🚀 Deploy All Ready
              </button>
            </span>
          )}
        </div>

        {loading ? (
          <div style={empty}>Loading…</div>
        ) : !project ? (
          <div style={empty}>Select a project above.</div>
        ) : rows.length === 0 ? (
          <div style={empty}>
            No workers shortlisted. Go to Allocation first.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Worker</th>
                  <th style={th}>Position</th>
                  <th style={th}>Medical Fit</th>
                  <th style={th}>PPE</th>
                  <th style={th}>Safety Induction</th>
                  <th style={th}>MOB</th>
                  <th style={th}>D-MOB</th>
                  <th style={th}>Platform</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const med = medicalFit(r.medicalExpiry);
                  const st = rowStatus(r);
                  const locked = r.deployed;
                  const age = calcAge(r.birthDate);
                  return (
                    <tr key={r.employeeId}>
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{r.fullName}</div>
                        <div style={{ fontSize: "11px", color: "#6c757d" }}>
                          {r.empCode}
                          {age ? ` · Age ${age}` : ""}
                        </div>
                      </td>
                      <td style={td}>{r.position}</td>

                      <td style={td}>
                        <Badge tone={med.tone}>{med.label}</Badge>
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={r.ppe}
                          disabled={locked}
                          onChange={(e) =>
                            updateRow(r.employeeId, { ppe: e.target.checked })
                          }
                        />
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={r.safetyInduction}
                          disabled={locked}
                          onChange={(e) =>
                            updateRow(r.employeeId, {
                              safetyInduction: e.target.checked,
                            })
                          }
                        />
                      </td>

                      <td style={td}>
                        <input
                          type="date"
                          value={r.mobDate || ""}
                          disabled={locked}
                          onChange={(e) =>
                            updateRow(r.employeeId, { mobDate: e.target.value })
                          }
                          style={input}
                        />
                      </td>

                      <td style={{ ...td, color: "#6c757d" }}>
                        {addDays(r.mobDate, DEMOB_DAYS) || "—"}
                      </td>

                      <td style={td}>
                        <input
                          type="text"
                          placeholder="e.g. BELQ"
                          value={r.platform}
                          disabled={locked}
                          onChange={(e) =>
                            updateRow(r.employeeId, {
                              platform: e.target.value,
                            })
                          }
                          style={{ ...input, maxWidth: "110px" }}
                        />
                      </td>

                      <td style={td}>
                        <Badge tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Badge>
                        {r.deployed && r.deployedAt && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#adb5bd",
                              marginTop: "3px",
                            }}
                          >
                            Deployed {ymd(r.deployedAt)}
                          </div>
                        )}
                      </td>

                      {/* actions */}
                      <td style={td}>
                        {r.deployed ? (
                          <button
                            onClick={() => undeployRow(r.employeeId)}
                            style={{
                              ...btnBase,
                              border: "1px solid #f5c2c7",
                              color: "#842029",
                            }}
                          >
                            Undeploy
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => deployRow(r.employeeId)}
                              disabled={!isReady(r)}
                              style={{
                                ...btnBase,
                                background: isReady(r) ? "#fff" : "#f8f9fa",
                                border: `1px solid ${
                                  isReady(r) ? "#0f5132" : "#dee2e6"
                                }`,
                                color: isReady(r) ? "#0f5132" : "#adb5bd",
                                cursor: isReady(r) ? "pointer" : "not-allowed",
                              }}
                            >
                              Deploy
                            </button>
                            <button
                              onClick={() => removeFromShortlist(r)}
                              title="เอาออกจาก shortlist (กลับเป็น proposed ใน Allocation)"
                              style={{
                                ...btnBase,
                                border: "1px solid #dee2e6",
                                color: "#6c757d",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
