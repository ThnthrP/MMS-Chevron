import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

const RETIREMENT_AGE = 60;

// ── helpers ───────────────────────────────────────────────
const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const formatExperience = (startWorkDate) => {
  if (!startWorkDate) return "—";
  const start = new Date(startWorkDate);
  if (isNaN(start.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years}y ${rem}m`;
};

const getAge = (birthDate) => {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
};

// วันหมดอายุ -> สี + หมายเหตุ
const expiryInfo = (date) => {
  if (!date) return { text: "No expiry", color: "#6c757d", note: "" };
  const d = new Date(date);
  if (isNaN(d.getTime())) return { text: "—", color: "#6c757d", note: "" };
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  const text = d.toLocaleDateString();
  if (days < 0)
    return { text, color: "#dc3545", note: `expired ${Math.abs(days)}d ago` };
  if (days < 30) return { text, color: "#cc8400", note: `${days}d left` };
  if (days <= 60) return { text, color: "#0aa2c0", note: `${days}d left` };
  return { text, color: "#198754", note: `${days}d left` };
};

const medicalStatusInfo = (status) => {
  switch (status) {
    case "passed":
      return { label: "Fit", bg: "#d1e7dd", color: "#0f5132" };
    case "pending":
      return { label: "Pending", bg: "#fff3cd", color: "#664d03" };
    case "failed":
      return { label: "Unfit", bg: "#f8d7da", color: "#842029" };
    case "not_required":
      return { label: "Fit w/ Restriction", bg: "#e8f0ff", color: "#0d6efd" };
    case "overdue":
      return { label: "Overdue", bg: "#f8d7da", color: "#842029" };
    case "due_soon":
      return { label: "Due Soon", bg: "#fff3cd", color: "#664d03" };
    default:
      return { label: status || "N/A", bg: "#f1f3f5", color: "#6c757d" };
  }
};

export default function WorkerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { backendUrl } = useContext(AppContent);

  const [worker, setWorker] = useState(null);
  const [positions, setPositions] = useState([]);
  const [globalTrainings, setGlobalTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workerRes, posRes, trainingRes] = await Promise.all([
          axios.get(`${backendUrl}/api/workers/${id}`, {
            withCredentials: true,
          }),
          axios
            .get(`${backendUrl}/api/positions`, { withCredentials: true })
            .catch(() => ({ data: [] })),
          axios
            .get(`${backendUrl}/api/trainings/global`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
        ]);
        setWorker(workerRes.data);
        setPositions(posRes.data || []);
        setGlobalTrainings(trainingRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load worker.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, backendUrl]);

  // ── shared styles (เหมือน Add/Edit) ──
  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "4px",
    display: "block",
  };
  const valueStyle = { fontSize: "14px", fontWeight: 500, color: "#212529" };
  const sectionCard = {
    background: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
    marginBottom: "1.5rem",
    overflow: "hidden",
  };
  const sectionHeader = {
    padding: "14px 20px",
    borderBottom: "1px solid #dee2e6",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };
  const sectionBody = { padding: "20px" };
  const grid3 = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px",
  };

  const SectionHeader = ({ number, title, accent }) => (
    <div style={{ ...sectionHeader, background: accent ? "#fff5f5" : "#fff" }}>
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: accent ? "#e53e3e" : "#0d6efd",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "13px",
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <span
        style={{
          fontWeight: 600,
          fontSize: "15px",
          color: accent ? "#c53030" : "#212529",
        }}
      >
        {title}
      </span>
    </div>
  );

  const Field = ({ label, value }) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={valueStyle}>{value ?? "—"}</div>
    </div>
  );

  const badge = (bg, color, text) => (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "6px",
        background: bg,
        color,
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );

  const statusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return badge("#d1e7dd", "#0f5132", "Active");
      case "inactive":
        return badge("#f8d7da", "#842029", "Inactive");
      default:
        return badge("#f1f3f5", "#6c757d", status || "—");
    }
  };
  const availabilityBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return badge("#d1e7dd", "#0f5132", "Available");
      case "unavailable":
        return badge("#f8d7da", "#842029", "Unavailable");
      default:
        return badge("#f1f3f5", "#6c757d", status || "—");
    }
  };
  const mobilizationBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "ready":
        return badge("#d1e7dd", "#0f5132", "Ready");
      case "on_site":
        return badge("#cfe2ff", "#084298", "On-Site");
      case "pending":
        return badge("#fff3cd", "#664d03", "Pending");
      default:
        return badge("#f1f3f5", "#6c757d", status || "—");
    }
  };

  // ── loading / error / not found ──
  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "40px",
              textAlign: "center",
              fontSize: "14px",
              color: "#6c757d",
            }}
          >
            Loading worker data...
          </div>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="container-fluid p-4">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/admin/workers")}
            style={{
              background: "none",
              border: "none",
              color: "#6c757d",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0,
              marginBottom: "12px",
            }}
          >
            ← Back to Workers
          </button>
          <div
            style={{
              background: "#f8d7da",
              color: "#842029",
              border: "1px solid #f5c6cb",
              borderRadius: "10px",
              padding: "20px",
              fontSize: "14px",
            }}
          >
            {error || "Worker not found"}
          </div>
        </div>
      </div>
    );
  }

  const w = worker;
  const positionName =
    w.position?.name ||
    positions.find((p) => p.id === w.positionId)?.name ||
    "—";

  const trainingName = (t) =>
    t.globalTraining?.name ||
    globalTrainings.find((g) => g.id === t.globalTrainingId)?.name ||
    t.rawTrainingName ||
    "—";

  const certs = w.trainings || w.certifications || [];
  const medicalRecords = w.medicalChecks || [];
  const medCheck = medicalRecords.find(
    (m) => m.checkType === "Medical Check up",
  );
  const confinedSpace = medicalRecords.find(
    (m) => m.checkType === "Confined Space Entry",
  );

  const age = getAge(w.birthDate);
  const retireFlag =
    age != null && age >= RETIREMENT_AGE
      ? badge("#f8d7da", "#842029", "⚠ Over retirement age")
      : age != null && age >= RETIREMENT_AGE - 1
        ? badge("#fff3cd", "#664d03", "⚠ Near retirement")
        : null;

  const ppExpiry = expiryInfo(w.passport?.expiryDate);
  const wpExpiry = expiryInfo(w.passport?.workPermitExpiryDate);

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/admin/workers")}
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
          ← Back to Workers
        </button>

        {/* Header Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "20px 24px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: 700 }}>
                {w.fullName}
              </span>
              {w.empCode && (
                <span
                  style={{
                    background: "#e9f5fb",
                    color: "#0d6efd",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  {w.empCode}
                </span>
              )}
              {w.isOffshore && badge("#cfe2ff", "#084298", "Offshore")}
              {retireFlag}
            </div>
            <div style={{ fontSize: "13px", color: "#6c757d" }}>
              {positionName}
              {w.division ? ` · ${w.division}` : ""}
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "12px",
                flexWrap: "wrap",
              }}
            >
              {statusBadge(w.status)}
              {availabilityBadge(w.availabilityStatus)}
              {mobilizationBadge(w.mobilizationStatus)}
            </div>
          </div>
          <button
            onClick={() => navigate(`/admin/workers/${id}/edit`)}
            style={{
              background: "#0d6efd",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ✏️ Edit
          </button>
        </div>

        {/* Section 1: Basic Information */}
        <div style={sectionCard}>
          <SectionHeader number="1" title="Basic Information" />
          <div style={sectionBody}>
            <div style={{ ...grid3, rowGap: "20px" }}>
              <Field label="Nationality" value={w.nationality || "—"} />
              <Field label="Position / Trade" value={positionName} />
              <Field label="Department" value={w.division || "—"} />
              <Field label="Start Work Date" value={fmtDate(w.startWorkDate)} />
              <Field
                label="Experience"
                value={formatExperience(w.startWorkDate)}
              />
              {w.birthDate ? (
                <Field
                  label="Date of Birth"
                  value={`${fmtDate(w.birthDate)}${age != null ? ` (${age} yrs)` : ""}`}
                />
              ) : (
                <Field label="Date of Birth" value="—" />
              )}
              <Field label="Phone" value={w.phone || "—"} />
              <Field label="Email" value={w.email || "—"} />
            </div>
            {w.notes && (
              <div style={{ marginTop: "20px" }}>
                <span style={labelStyle}>Notes</span>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#495057",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {w.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Passport */}
        <div style={sectionCard}>
          <SectionHeader number="2" title="Passport Information" />
          <div style={sectionBody}>
            <div style={{ ...grid3, rowGap: "20px" }}>
              <Field
                label="Passport Number"
                value={w.passport?.passportNo || "—"}
              />
              <div>
                <span style={labelStyle}>Passport Expiry</span>
                <div style={{ ...valueStyle, color: ppExpiry.color }}>
                  {ppExpiry.text}
                  {ppExpiry.note && (
                    <span style={{ fontSize: "11px", marginLeft: "6px" }}>
                      ({ppExpiry.note})
                    </span>
                  )}
                </div>
              </div>
              <div />
              <Field
                label="Work Permit No."
                value={w.passport?.workPermitNo || "—"}
              />
              <div>
                <span style={labelStyle}>Work Permit Expiry</span>
                <div style={{ ...valueStyle, color: wpExpiry.color }}>
                  {wpExpiry.text}
                  {wpExpiry.note && (
                    <span style={{ fontSize: "11px", marginLeft: "6px" }}>
                      ({wpExpiry.note})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Certifications */}
        <div style={sectionCard}>
          <SectionHeader number="3" title="Certifications" />
          <div style={{ padding: certs.length === 0 ? "20px" : "0" }}>
            {certs.length === 0 ? (
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px dashed #dee2e6",
                  borderRadius: "8px",
                  padding: "28px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#6c757d",
                }}
              >
                No certifications on record.
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
                    {["TRAINING / CERTIFICATION", "ISSUED", "EXPIRY"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 20px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#6c757d",
                            letterSpacing: "0.5px",
                            textAlign: "left",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {certs.map((t, i) => {
                    const exp = expiryInfo(t.expiryDate);
                    return (
                      <tr
                        key={t.id || i}
                        style={{ borderTop: "1px solid #f1f3f5" }}
                      >
                        <td style={{ padding: "12px 20px", fontWeight: 600 }}>
                          {trainingName(t)}
                        </td>
                        <td style={{ padding: "12px 20px", color: "#6c757d" }}>
                          {fmtDate(t.completedDate)}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ color: exp.color, fontWeight: 600 }}>
                            {exp.text}
                          </span>
                          {exp.note && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: exp.color,
                                marginLeft: "8px",
                              }}
                            >
                              ({exp.note})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 4: Medical */}
        <div style={sectionCard}>
          <SectionHeader number="4" title="Medical Records" accent />
          <div style={sectionBody}>
            {!medCheck && !confinedSpace ? (
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px dashed #dee2e6",
                  borderRadius: "8px",
                  padding: "28px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#6c757d",
                }}
              >
                No medical records on record.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {[
                  { label: "Medical Check up", rec: medCheck },
                  { label: "Confined Space Entry", rec: confinedSpace },
                ]
                  .filter((x) => x.rec)
                  .map(({ label, rec }) => {
                    const info = medicalStatusInfo(rec.status);
                    const exp = expiryInfo(rec.expiryDate);
                    return (
                      <div
                        key={label}
                        style={{
                          border: "1px solid #e9ecef",
                          borderRadius: "8px",
                          padding: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "14px" }}>
                            {label}
                          </span>
                          {badge(info.bg, info.color, info.label)}
                        </div>
                        <div style={{ ...grid3, rowGap: "12px" }}>
                          <Field
                            label="Hospital / Clinic"
                            value={rec.hospital || "—"}
                          />
                          <Field
                            label="Examination Date"
                            value={fmtDate(rec.issuedDate)}
                          />
                          <div>
                            <span style={labelStyle}>Expiry Date</span>
                            <div style={{ ...valueStyle, color: exp.color }}>
                              {exp.text}
                              {exp.note && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    marginLeft: "6px",
                                  }}
                                >
                                  ({exp.note})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {rec.notes && (
                          <div style={{ marginTop: "12px" }}>
                            <span style={labelStyle}>Notes</span>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#495057",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                              }}
                            >
                              {rec.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
