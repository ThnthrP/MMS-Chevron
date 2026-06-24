import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ISO datetime/date -> "YYYY-MM-DD" สำหรับ <input type="date">
const toDateInput = (val) => {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);

  const [project, setProject] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    contractId: "",
    location: "",
    notes: "",
    startDate: "",
    endDate: "",
    isOffshore: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectRes, clientsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/projects/${id}`, {
            withCredentials: true,
          }),
          axios
            .get(`${backendUrl}/api/clients`, { withCredentials: true })
            .catch(() => ({ data: [] })),
        ]);

        const p = projectRes.data;
        setProject(p);
        setClients(clientsRes.data || []);
        setForm({
          name: p.name || "",
          contractId: p.contractId || p.contract?.id || "",
          location: p.location || "",
          notes: p.notes || "",
          startDate: toDateInput(p.startDate),
          endDate: toDateInput(p.endDate),
          isOffshore: p.isOffshore || false,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, backendUrl]);

  // มี position request แล้วหรือยัง → ใช้ตัดสินใจ lock contract
  const hasRequests = (project?.requests?.length ?? 0) > 0;

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.contractId) {
      setError("Project Name and Client/Contract are required.");
      return;
    }
    try {
      setSubmitting(true);
      await axios.put(
        `${backendUrl}/api/projects/${id}`,
        {
          name: form.name,
          // ถ้า lock อยู่ ส่ง contractId เดิม (ไม่เปลี่ยน)
          contractId: hasRequests
            ? project?.contractId || form.contractId
            : form.contractId,
          location: form.location || null,
          notes: form.notes || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          isOffshore: form.isOffshore,
        },
        { withCredentials: true },
      );
      navigate(`/admin/projects/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update project.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── styles (เหมือน Project.jsx / EditWorker) ──
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

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
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
            Loading project...
          </div>
        </div>
      </div>
    );
  }

  if (!project && error) {
    return (
      <div className="container-fluid p-4">
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/admin/projects")}
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
            ← Back to Projects
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
            {error || "Project not found"}
          </div>
        </div>
      </div>
    );
  }

  const currentContractLabel = `${project?.contract?.client?.name || "—"} — ${
    project?.contract?.name || "—"
  }`;

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => navigate(`/admin/projects/${id}`)}
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
          ← Back to Project
        </button>

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🗂</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Edit Project
            </span>
            <span style={{ color: "#6c757d", fontSize: "13px" }}>
              {project?.name}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#f8d7da",
              color: "#842029",
              border: "1px solid #f5c6cb",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "13px",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Form Card */}
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
            General Information
          </div>

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
                  onChange={(e) => handleChange("name", e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Client / Contract — lock ถ้ามี request แล้ว */}
              <div>
                <label style={labelStyle}>Client / Contract *</label>
                {hasRequests ? (
                  <>
                    <div
                      style={{
                        ...inputStyle,
                        background: "#f8f9fa",
                        color: "#495057",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "not-allowed",
                      }}
                      title="เปลี่ยนไม่ได้เพราะมี position request แล้ว"
                    >
                      🔒 {currentContractLabel}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#664d03",
                        marginTop: "4px",
                      }}
                    >
                      ⚠ เปลี่ยน contract ไม่ได้ — โปรเจกต์นี้มี position request
                      แล้ว (matrix ผูกกับ contract)
                    </div>
                  </>
                ) : (
                  <select
                    value={form.contractId}
                    onChange={(e) => handleChange("contractId", e.target.value)}
                    style={inputStyle}
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
                )}
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location / Site</label>
                <input
                  type="text"
                  placeholder="e.g., Rayong Yard"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Offshore */}
              <div>
                <label style={labelStyle}>Offshore</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    height: "37px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="isOffshore"
                    checked={form.isOffshore}
                    onChange={(e) =>
                      handleChange("isOffshore", e.target.checked)
                    }
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                    }}
                  />
                  <label
                    htmlFor="isOffshore"
                    style={{ fontSize: "13px", cursor: "pointer" }}
                  >
                    งานนี้เป็น offshore (ลงแท่นกลางทะเล)
                  </label>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* End Date */}
              <div>
                <label style={labelStyle}>End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: "16px" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
              />
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
              onClick={() => navigate(`/admin/projects/${id}`)}
              disabled={submitting}
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
              disabled={submitting}
              style={{
                padding: "8px 20px",
                fontSize: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#0d6efd",
                color: "#fff",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
