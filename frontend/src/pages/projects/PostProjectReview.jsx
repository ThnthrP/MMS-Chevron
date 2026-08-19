import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import useStickyState from "../../hooks/useStickyState";
import Select from "react-select";

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

  const canManageReview = ["admin", "manpower"].includes(userData?.role?.name);

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

  // ← ใหม่: format วันที่แบบสั้น สำหรับ disambiguate project ที่ชื่อซ้ำกัน
  const fmtProjectDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  // ← ใหม่: options สำหรับ Select Project (react-select แทน native <select>)
  const projectOptions = projects.map((p) => {
    const codePart = p.masterProjectRecord?.projectCode
      ? `[${p.masterProjectRecord.projectCode}] `
      : "";
    const startPart = fmtProjectDate(p.startDate);
    const locationPart = p.location || null;
    const idTail = p.id.slice(-6);

    const parts = [];
    if (locationPart) parts.push(locationPart);
    if (startPart) parts.push(`Start ${startPart}`);

    const disambiguator = parts.length > 0 ? parts.join(" · ") : `#${idTail}`;

    const clientPart = p.client ? ` — ${p.client}` : "";
    const statusPart = p.status === "completed" ? " (completed)" : "";

    return {
      value: p.id,
      label: `${codePart}${p.name}${clientPart} · ${disambiguator}${statusPart}`,
      project: p,
    };
  });

  const projectSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#ced4da",
      borderRadius: "8px",
      minHeight: "40px",
      fontSize: "14px",
      boxShadow: "none",
      "&:hover": { borderColor: "#86b7fe" },
    }),
    option: (provided) => ({ ...provided, fontSize: "13px" }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "14px",
      color: "#6c757d",
    }),
    menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
    menu: (provided) => ({ ...provided, minWidth: "560px" }),
    menuList: (provided) => ({ ...provided, maxHeight: "360px" }),
  };

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* header */}
        <div style={{ ...card, marginTop: 0 }}>
          <div style={{ padding: "18px" }}>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>
              ⭐ Post-Project Review
            </div>
            <div
              style={{ marginTop: "6px", fontSize: "12px", color: "#6c757d" }}
            >
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
          <div style={{ flex: "1 1 320px", maxWidth: "420px" }}>
            <Select
              options={projectOptions}
              styles={projectSelectStyles}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              value={
                projectOptions.find((o) => o.value === selectedProjectId) ||
                null
              }
              onChange={(o) => setSelectedProjectId(o ? o.value : "")}
              placeholder="-- Select Active / Completed Project --"
              isClearable
              noOptionsMessage={() => "No projects found"}
            />
          </div>

          {canManageReview && (
            <button
              onClick={markCompleted}
              disabled={!project || project.status === "completed"}
              style={{
                border: "1px solid #198754",
                background:
                  project && project.status !== "completed"
                    ? "#198754"
                    : "#e9ecef",
                color:
                  project && project.status !== "completed"
                    ? "#fff"
                    : "#adb5bd",
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
          )}

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
            <div style={empty}>
              Select a project to review deployed workers.
            </div>
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
                        style={{
                          ...td,
                          color: "#6c757d",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ymd(r.mobDate)} → {ymd(r.demobDate)}
                      </td>

                      {/* rating */}
                      <td style={td}>
                        <Stars
                          value={r.rating}
                          onChange={(n) =>
                            updateRow(r.employeeId, { rating: n })
                          }
                          disabled={!canManageReview}
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
                                  canManageReview &&
                                  updateRow(r.employeeId, { rehire: key })
                                }
                                disabled={!canManageReview}
                                style={{
                                  border: `1px solid ${active ? t.color : "#dee2e6"}`,
                                  background: active ? t.bg : "#fff",
                                  color: active ? t.color : "#adb5bd",
                                  borderRadius: "6px",
                                  padding: "3px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: canManageReview
                                    ? "pointer"
                                    : "default",
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
                          disabled={!canManageReview}
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
                            background: canManageReview ? "#fff" : "#f8f9fa",
                          }}
                        />
                      </td>

                      {/* save */}
                      <td style={td}>
                        {canManageReview ? (
                          <button
                            onClick={() => saveRow(r)}
                            disabled={!r.dirty && r.saved}
                            style={{
                              border: `1px solid ${
                                r.dirty || !r.saved ? "#0d6efd" : "#dee2e6"
                              }`,
                              background: "#fff",
                              color:
                                r.dirty || !r.saved ? "#0d6efd" : "#adb5bd",
                              borderRadius: "6px",
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor:
                                r.dirty || !r.saved ? "pointer" : "default",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.saved && !r.dirty ? "✓ Saved" : "Save"}
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#adb5bd" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
