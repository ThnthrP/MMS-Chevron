import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";

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

function ymd(d) {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

// ── rating stars (1-5) ──
function Stars({ value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => !disabled && onChange(n)}
          style={{
            cursor: disabled ? "default" : "pointer",
            fontSize: "18px",
            lineHeight: 1,
            color: n <= value ? "#f5a623" : "#dee2e6",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const REHIRE = [
  ["yes", "Yes", "ok"],
  ["maybe", "Maybe", "warn"],
  ["no", "No", "danger"],
];

export default function PostProjectReview() {
  const { backendUrl, userData } = useContext(AppContent);

  const [projects, setProjects] = useState([]);
  //   const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useStickyState(
    "review_projectId",
    "",
  );
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/review/projects`, { withCredentials: true })
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setRows([]);
      return;
    }
    fetchDetail(selectedProjectId);
  }, [selectedProjectId]);

  const fetchDetail = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/review/${projectId}`, {
        withCredentials: true,
      });
      setProject(res.data.project);
      setRows(buildRows(res.data.workers));
    } catch (err) {
      console.error(err);
      setProject(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const buildRows = (workers) =>
    workers.map((w) => ({
      ...w,
      rating: w.review?.rating ?? 0,
      rehire: w.review?.rehire ?? "maybe",
      comment: w.review?.comment ?? "",
      saved: !!w.review,
      dirty: false,
    }));

  const updateRow = (employeeId, patch) => {
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId ? { ...r, ...patch, dirty: true } : r,
      ),
    );
  };

  const saveRow = async (row) => {
    if (!row.rating) {
      alert("ใส่คะแนน (rating) ก่อนบันทึก");
      return;
    }
    try {
      await axios.post(
        `${backendUrl}/api/review`,
        {
          projectId: project.id,
          employeeId: row.employeeId,
          rating: row.rating,
          rehire: row.rehire,
          comment: row.comment,
          reviewedById: userData?.id ?? null,
        },
        { withCredentials: true },
      );
      setRows((prev) =>
        prev.map((r) =>
          r.employeeId === row.employeeId
            ? { ...r, saved: true, dirty: false }
            : r,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Save failed — ดู console");
    }
  };

  const markCompleted = async () => {
    if (!project) {
      alert("Select a project first.");
      return;
    }
    if (project.status === "completed") {
      alert("Project นี้ completed อยู่แล้ว");
      return;
    }
    if (
      !window.confirm(
        `ปิดโปรเจกต์ "${project.name}"? (assignment ทั้งหมดจะถูก mark completed)`,
      )
    )
      return;
    try {
      await axios.put(
        `${backendUrl}/api/review/complete`,
        { projectId: project.id },
        { withCredentials: true },
      );
      await fetchDetail(project.id);
      // refresh dropdown status
      const res = await axios.get(`${backendUrl}/api/review/projects`, {
        withCredentials: true,
      });
      setProjects(res.data);
    } catch (err) {
      console.error(err);
      alert("Complete failed — ดู console");
    }
  };

  // ── styles ──
  const card = {
    background: "#fff",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "16px",
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
            ⭐ Post-Project Review
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
            Step 12: Performance Review → Status: 'Available'
          </div>
        </div>
      </div>

      {/* project select + complete */}
      <div
        style={{
          ...card,
          padding: "16px 18px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{
            flex: "1 1 320px",
            maxWidth: "420px",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "14px",
          }}
        >
          <option value="">-- Select Active / Completed Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.client ? ` — ${p.client}` : ""}
              {p.status === "completed" ? " (completed)" : ""}
            </option>
          ))}
        </select>

        <button
          onClick={markCompleted}
          disabled={!project || project.status === "completed"}
          style={{
            border: "1px solid #198754",
            background:
              project && project.status !== "completed" ? "#198754" : "#e9ecef",
            color:
              project && project.status !== "completed" ? "#fff" : "#adb5bd",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor:
              project && project.status !== "completed"
                ? "pointer"
                : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          ✔ Mark Project Completed
        </button>

        {project && (
          <Badge tone={project.status === "completed" ? "ok" : "info"}>
            {project.status === "completed" ? "Completed" : "Active"}
          </Badge>
        )}
      </div>

      {/* workers + review */}
      <div style={card}>
        {loading ? (
          <div style={empty}>Loading…</div>
        ) : !project ? (
          <div style={empty}>Select a project to review deployed workers.</div>
        ) : rows.length === 0 ? (
          <div style={empty}>No deployed workers for this project.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Worker</th>
                  <th style={th}>Position</th>
                  <th style={th}>Platform</th>
                  <th style={th}>MOB → D-MOB</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Rehire?</th>
                  <th style={th}>Comment</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{r.fullName}</div>
                      <div style={{ fontSize: "11px", color: "#6c757d" }}>
                        {r.empCode}
                      </div>
                    </td>
                    <td style={td}>{r.position}</td>
                    <td style={td}>{r.platform || "—"}</td>
                    <td
                      style={{ ...td, color: "#6c757d", whiteSpace: "nowrap" }}
                    >
                      {ymd(r.mobDate)} → {ymd(r.demobDate)}
                    </td>

                    {/* rating */}
                    <td style={td}>
                      <Stars
                        value={r.rating}
                        onChange={(n) => updateRow(r.employeeId, { rating: n })}
                      />
                    </td>

                    {/* rehire */}
                    <td style={td}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {REHIRE.map(([key, label, tone]) => {
                          const active = r.rehire === key;
                          const t = TONE[tone];
                          return (
                            <button
                              key={key}
                              onClick={() =>
                                updateRow(r.employeeId, { rehire: key })
                              }
                              style={{
                                border: `1px solid ${active ? t.color : "#dee2e6"}`,
                                background: active ? t.bg : "#fff",
                                color: active ? t.color : "#adb5bd",
                                borderRadius: "6px",
                                padding: "3px 10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* comment */}
                    <td style={td}>
                      <input
                        type="text"
                        placeholder="หมายเหตุ…"
                        value={r.comment}
                        onChange={(e) =>
                          updateRow(r.employeeId, { comment: e.target.value })
                        }
                        style={{
                          border: "1px solid #ced4da",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          fontSize: "12px",
                          width: "100%",
                          minWidth: "160px",
                        }}
                      />
                    </td>

                    {/* save */}
                    <td style={td}>
                      <button
                        onClick={() => saveRow(r)}
                        disabled={!r.dirty && r.saved}
                        style={{
                          border: `1px solid ${
                            r.dirty || !r.saved ? "#0d6efd" : "#dee2e6"
                          }`,
                          background: "#fff",
                          color: r.dirty || !r.saved ? "#0d6efd" : "#adb5bd",
                          borderRadius: "6px",
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: r.dirty || !r.saved ? "pointer" : "default",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.saved && !r.dirty ? "✓ Saved" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
