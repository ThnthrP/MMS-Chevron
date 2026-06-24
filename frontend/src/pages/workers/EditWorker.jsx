import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";
// import { DIVISIONS } from "../../constants/divisions";

// แปลง ISO datetime / date -> "YYYY-MM-DD" สำหรับ <input type="date">
const toDateInput = (val) => {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export default function EditWorker() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { backendUrl } = useContext(AppContent);

  const [positions, setPositions] = useState([]);
  const [globalTrainings, setGlobalTrainings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [certifications, setCertifications] = useState([]);
  const [removedCertIds, setRemovedCertIds] = useState([]);

  const [divisions, setDivisions] = useState([]);

  const [formData, setFormData] = useState({
    empCode: "",
    fullName: "",
    nationality: "",
    positionId: "",
    division: "",
    birthDate: "",
    startWorkDate: "",
    status: "active",
    availabilityStatus: "available",
    mobilizationStatus: "pending",
    isOffshore: false,
    isPermanent: false,
    healthRisk: "",
    healthNote: "",
    sseLevel: "",
    sseCompleted: "",
    passportNumber: "",
    passportExpiryDate: "",
    workPermitNo: "",
    workPermitExpiryDate: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [medicalData, setMedicalData] = useState({
    medicalId: null,
    confinedSpaceId: null,
    hospital: "",
    issuedDate: "",
    expiryDate: "",
    status: "",
    confinedSpaceStatus: "",
    notes: "",
  });

  // ===========================================================
  // Fetch reference data + worker, then populate the form
  // ===========================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let posData = [];
        try {
          const r = await axios.get(`${backendUrl}/api/positions/manage`, {
            withCredentials: true,
          });
          posData = r.data;
        } catch {
          const r = await axios.get(`${backendUrl}/api/positions`, {
            withCredentials: true,
          });
          posData = r.data;
        }
        const [trainingRes, workerRes] = await Promise.all([
          axios.get(`${backendUrl}/api/trainings/global`, {
            withCredentials: true,
          }),
          axios.get(`${backendUrl}/api/workers/${id}`, {
            withCredentials: true,
          }),
        ]);

        setPositions(posData);
        setGlobalTrainings(trainingRes.data);

        const w = workerRes.data;

        setFormData({
          empCode: w.empCode || "",
          fullName: w.fullName || "",
          nationality: w.nationality || "",
          positionId: w.positionId || "",
          division: w.division || "",
          birthDate: toDateInput(w.birthDate),
          startWorkDate: toDateInput(w.startWorkDate),
          status: w.status || "active",
          availabilityStatus: w.availabilityStatus || "available",
          mobilizationStatus: w.mobilizationStatus || "pending",
          isOffshore: w.isOffshore || false,
          isPermanent: w.isPermanent || false,
          healthRisk: w.healthRisk || "",
          healthNote: w.healthNote || "",
          sseLevel: w.sseLevel || "",
          sseCompleted:
            w.sseCompleted === true
              ? "true"
              : w.sseCompleted === false
                ? "false"
                : "",
          passportNumber: w.passport?.passportNo || "",
          passportExpiryDate: toDateInput(w.passport?.expiryDate),
          workPermitNo: w.passport?.workPermitNo || "",
          workPermitExpiryDate: toDateInput(w.passport?.workPermitExpiryDate),
          phone: w.phone || "",
          email: w.email || "",
          notes: w.notes || "",
        });

        // Certifications / trainings
        const rawCerts = w.trainings || w.certifications || [];
        setCertifications(
          rawCerts.map((t) => ({
            id: t.id, // local key
            dbId: t.id, // existing record id
            globalTrainingId: t.globalTrainingId || "",
            completedDate: toDateInput(t.completedDate),
            expiryDate: toDateInput(t.expiryDate),
          })),
        );

        // Medical records — tolerant match กัน checkType สะกดต่าง
        const records = w.medicalChecks || [];
        const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();
        const med = records.find((m) => norm(m.checkType) === "medicalcheckup");
        const cse = records.find(
          (m) => norm(m.checkType) === "confinedspaceentry",
        );

        setMedicalData({
          medicalId: med?.id || null,
          confinedSpaceId: cse?.id || null,
          hospital: med?.hospital || cse?.hospital || "",
          issuedDate: toDateInput(med?.issuedDate || cse?.issuedDate),
          expiryDate: toDateInput(med?.expiryDate || cse?.expiryDate),
          status: med?.status || "",
          confinedSpaceStatus: cse?.status || "",
          notes: med?.notes || cse?.notes || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load worker data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, backendUrl]);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/divisions`, { withCredentials: true })
      .then((res) => setDivisions(res.data.map((d) => d.name)))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  // ===========================================================
  // Handlers
  // ===========================================================
  const addCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        dbId: null,
        globalTrainingId: "",
        completedDate: "",
        expiryDate: "",
      },
    ]);
  };

  const removeCertification = (cert) => {
    if (cert.dbId) {
      setRemovedCertIds((prev) => [...prev, cert.dbId]);
    }
    setCertifications((prev) => prev.filter((c) => c.id !== cert.id));
  };

  const handleCertChange = (localId, field, value) =>
    setCertifications((prev) =>
      prev.map((c) => (c.id === localId ? { ...c, [field]: value } : c)),
    );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMedicalChange = (e) => {
    const { name, value } = e.target;
    setMedicalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.empCode || !formData.fullName) {
      setError("Employee Code and Full Name are required.");
      return;
    }
    try {
      setSubmitting(true);

      // 1) Basic info
      await axios.put(
        `${backendUrl}/api/workers/${id}`,
        {
          empCode: formData.empCode,
          fullName: formData.fullName,
          nationality: formData.nationality || null,
          phone: formData.phone || null,
          email: formData.email || null,
          positionId: formData.positionId || null,
          division: formData.division || null,
          birthDate: formData.birthDate || null,
          startWorkDate: formData.startWorkDate || null,
          status: formData.status,
          availabilityStatus: formData.availabilityStatus,
          mobilizationStatus: formData.mobilizationStatus,
          isOffshore: formData.isOffshore,
          isPermanent: formData.isPermanent,
          healthRisk: formData.healthRisk || null,
          healthNote: formData.healthNote || null,
          sseLevel: formData.sseLevel || null,
          sseCompleted:
            formData.sseCompleted === ""
              ? null
              : formData.sseCompleted === "true",
          notes: formData.notes || null,
        },
        { withCredentials: true },
      );

      // 2) Passport (upsert)
      if (
        formData.passportNumber ||
        formData.passportExpiryDate ||
        formData.workPermitNo ||
        formData.workPermitExpiryDate
      ) {
        await axios.post(
          `${backendUrl}/api/workers/${id}/passport`,
          {
            passportNo: formData.passportNumber || null,
            expiryDate: formData.passportExpiryDate || null,
            workPermitNo: formData.workPermitNo || null,
            workPermitExpiryDate: formData.workPermitExpiryDate || null,
          },
          { withCredentials: true },
        );
      }

      // 3) Certifications — delete removed, update existing, add new
      for (const certId of removedCertIds) {
        await axios.delete(
          `${backendUrl}/api/workers/${id}/trainings/${certId}`,
          { withCredentials: true },
        );
      }

      for (const cert of certifications) {
        if (!cert.globalTrainingId) continue;
        const payload = {
          globalTrainingId: cert.globalTrainingId,
          completedDate: cert.completedDate || null,
          expiryDate: cert.expiryDate || null,
          source: "manual",
        };
        if (cert.dbId) {
          await axios.put(
            `${backendUrl}/api/workers/${id}/trainings/${cert.dbId}`,
            payload,
            { withCredentials: true },
          );
        } else {
          await axios.post(
            `${backendUrl}/api/workers/${id}/trainings`,
            payload,
            { withCredentials: true },
          );
        }
      }

      // 4) Medical — Medical Check up
      if (
        medicalData.hospital ||
        medicalData.issuedDate ||
        medicalData.status
      ) {
        const payload = {
          checkType: "Medical Check up",
          hospital: medicalData.hospital || null,
          issuedDate: medicalData.issuedDate || null,
          expiryDate: medicalData.expiryDate || null,
          status: medicalData.status || "pending",
          notes: medicalData.notes || null,
        };
        if (medicalData.medicalId) {
          await axios.put(
            `${backendUrl}/api/workers/${id}/medical/${medicalData.medicalId}`,
            payload,
            { withCredentials: true },
          );
        } else {
          await axios.post(`${backendUrl}/api/workers/${id}/medical`, payload, {
            withCredentials: true,
          });
        }
      }

      // 4b) Medical — Confined Space Entry
      if (
        medicalData.confinedSpaceStatus &&
        medicalData.confinedSpaceStatus !== ""
      ) {
        const payload = {
          checkType: "Confined Space Entry",
          hospital: medicalData.hospital || null,
          issuedDate: medicalData.issuedDate || null,
          expiryDate: medicalData.expiryDate || null,
          status: medicalData.confinedSpaceStatus,
          notes: medicalData.notes || null,
        };
        if (medicalData.confinedSpaceId) {
          await axios.put(
            `${backendUrl}/api/workers/${id}/medical/${medicalData.confinedSpaceId}`,
            payload,
            { withCredentials: true },
          );
        } else {
          await axios.post(`${backendUrl}/api/workers/${id}/medical`, payload, {
            withCredentials: true,
          });
        }
      }

      navigate("/admin/workers");
    } catch (err) {
      const method = err.config?.method?.toUpperCase();
      const url = err.config?.url?.replace(backendUrl, "");
      const status = err.response?.status;
      console.error("Update failed:", method, url, status, err.response?.data);
      setError(
        err.response?.data?.message ||
          `Failed to update worker. (${method || "?"} ${url || "?"} → ${
            status || "no response"
          })`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===========================================================
  // Shared styles (เหมือน AddWorker)
  // ===========================================================
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
    fontSize: "12px",
    fontWeight: 600,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "6px",
    display: "block",
  };
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
  const grid2 = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  };
  const grid3 = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
  };

  const SectionHeader = ({ number, title, subtitle, accent, right }) => (
    <div
      style={{
        ...sectionHeader,
        background: accent ? "#fff5f5" : "#fff",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        {subtitle && (
          <span style={{ fontSize: "12px", color: "#6c757d" }}>{subtitle}</span>
        )}
      </div>
      {right}
    </div>
  );

  // ===========================================================
  // Loading state
  // ===========================================================
  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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

  // ตัวเลือก Position — เฉพาะที่มีพนักงาน + ค้นหาได้
  // เผื่อ position ปัจจุบันของ worker ไม่อยู่ใน list (กันค่าหาย)
  const hasPosCounts = positions.some((p) => p._count);
  let positionPool = hasPosCounts
    ? positions.filter((p) => (p._count?.employees ?? 0) > 0)
    : positions;
  if (
    formData.positionId &&
    !positionPool.some((p) => p.id === formData.positionId)
  ) {
    const cur = positions.find((p) => p.id === formData.positionId);
    if (cur) positionPool = [cur, ...positionPool];
  }
  const positionOptions = positionPool.map((p) => ({
    value: p.id,
    label: `${p.name}${p._count ? ` (${p._count.employees})` : ""}`,
  }));
  // const departmentOptions = DIVISIONS.map((d) => ({ value: d, label: d }));
  let divisionPool = [...divisions];
  if (formData.division && !divisionPool.includes(formData.division)) {
    divisionPool = [formData.division, ...divisionPool];
  }
  const departmentOptions = divisionPool.map((d) => ({ value: d, label: d }));

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "4px",
              }}
            >
              <span style={{ fontSize: "18px", fontWeight: 700 }}>
                Edit Worker
              </span>
              {formData.empCode && (
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
                  {formData.empCode}
                </span>
              )}
            </div>
            <span style={{ fontSize: "13px", color: "#6c757d" }}>
              Update worker details &amp; records
            </span>
          </div>
          <button
            onClick={() => navigate("/admin/workers")}
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              padding: "7px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
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

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div style={sectionCard}>
            <SectionHeader number="1" title="Basic Information" />
            <div style={sectionBody}>
              <div
                style={{
                  ...grid2,
                  gridTemplateColumns: "1fr 2fr",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Employee Code <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="empCode"
                    placeholder="e.g., EXPT-001"
                    value={formData.empCode}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Full Name (as per Passport){" "}
                    <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="e.g., Somchai Jaidee"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  placeholder="e.g., Thai, Filipino"
                  value={formData.nationality}
                  onChange={handleChange}
                  style={{ ...inputStyle, maxWidth: "260px" }}
                />
              </div>
              <div style={{ ...grid2, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Position / Trade</label>
                  <Select
                    options={positionOptions}
                    value={
                      positionOptions.find(
                        (o) => o.value === formData.positionId,
                      ) || null
                    }
                    onChange={(o) =>
                      setFormData((prev) => ({
                        ...prev,
                        positionId: o ? o.value : "",
                      }))
                    }
                    placeholder="ค้นหา / เลือกตำแหน่ง..."
                    isClearable
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (b) => ({ ...b, zIndex: 1000000 }),
                      control: (b) => ({
                        ...b,
                        fontSize: "13px",
                        minHeight: "38px",
                        borderColor: "#dee2e6",
                      }),
                      option: (b) => ({ ...b, fontSize: "13px" }),
                    }}
                    noOptionsMessage={() =>
                      hasPosCounts ? "ไม่มีตำแหน่งที่มีพนักงาน" : "ไม่มีตำแหน่ง"
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <Select
                    options={departmentOptions}
                    value={
                      departmentOptions.find(
                        (o) => o.value === formData.division,
                      ) || null
                    }
                    onChange={(o) =>
                      setFormData((prev) => ({
                        ...prev,
                        division: o ? o.value : "",
                      }))
                    }
                    placeholder="ค้นหา / เลือกแผนก..."
                    isClearable
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (b) => ({ ...b, zIndex: 1000000 }),
                      control: (b) => ({
                        ...b,
                        fontSize: "13px",
                        minHeight: "38px",
                        borderColor: "#dee2e6",
                      }),
                      option: (b) => ({ ...b, fontSize: "13px" }),
                    }}
                    noOptionsMessage={() => "ไม่มีแผนก"}
                  />
                </div>
              </div>
              <div style={{ ...grid2, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Start Work Date</label>
                  <input
                    type="date"
                    name="startWorkDate"
                    value={formData.startWorkDate}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ ...grid2, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+66 xx xxx xxxx"
                    value={formData.phone}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="worker@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Additional notes, restrictions, or remarks..."
                  value={formData.notes}
                  onChange={handleChange}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Worker Status */}
          <div style={sectionCard}>
            <SectionHeader number="2" title="Worker Status" />
            <div style={sectionBody}>
              <div style={{ ...grid3, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Employee Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Availability</label>
                  <select
                    name="availabilityStatus"
                    value={formData.availabilityStatus}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Mobilization Status</label>
                  <select
                    name="mobilizationStatus"
                    value={formData.mobilizationStatus}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="pending">Pending</option>
                    <option value="ready">Ready</option>
                    <option value="on_site">On-Site</option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <input
                  type="checkbox"
                  id="isOffshore"
                  name="isOffshore"
                  checked={formData.isOffshore}
                  onChange={handleChange}
                  style={{
                    width: "16px",
                    height: "16px",
                    marginTop: "2px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <label htmlFor="isOffshore" style={{ cursor: "pointer" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#212529",
                    }}
                  >
                    Offshore Worker
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    Check if this worker is deployed to offshore locations
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section R: Offshore Roster (ติดตัวพนักงาน) */}
          <div style={sectionCard}>
            <SectionHeader
              number="R"
              title="Offshore Roster"
              subtitle="(ข้อมูลติดตัวพนักงาน — Health / SSE / Permanent)"
            />
            <div style={sectionBody}>
              <div style={{ ...grid3, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Health Risk</label>
                  <select
                    name="healthRisk"
                    value={formData.healthRisk}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">— Select —</option>
                    <option value="low">Low (ต่ำ)</option>
                    <option value="medium">Medium (ปานกลาง)</option>
                    <option value="high">High (สูง)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>SSE Level</label>
                  <select
                    name="sseLevel"
                    value={formData.sseLevel}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">— None —</option>
                    <option value="new_sse">NEW SSE</option>
                    <option value="sse1">SSE1</option>
                    <option value="sse2">SSE2</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>SSE Passed</label>
                  <select
                    name="sseCompleted"
                    value={formData.sseCompleted}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">— N/A —</option>
                    <option value="true">Completed</option>
                    <option value="false">Not yet</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>
                  Health Note (หมายเหตุสุขภาพ — แยกจาก Notes ทั่วไป)
                </label>
                <textarea
                  name="healthNote"
                  rows={2}
                  placeholder="เช่น ไขมันสูง / กรดยูริกสูง / ติดตามผล Medic"
                  value={formData.healthNote}
                  onChange={handleChange}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <input
                  type="checkbox"
                  id="isPermanent"
                  name="isPermanent"
                  checked={formData.isPermanent}
                  onChange={handleChange}
                  style={{
                    width: "16px",
                    height: "16px",
                    marginTop: "2px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <label htmlFor="isPermanent" style={{ cursor: "pointer" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#212529",
                    }}
                  >
                    Permanent Employee (พนักงานประจำ 🟩)
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    ติ๊กถ้าเป็นพนักงานประจำ (item เขียวในไฟล์ roster) —
                    Allocation จะเลือกก่อน
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Passport Information */}
          <div style={sectionCard}>
            <SectionHeader number="3" title="Passport Information" />
            <div style={sectionBody}>
              <div style={{ ...grid2, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Passport Number</label>
                  <input
                    type="text"
                    name="passportNumber"
                    placeholder="e.g., AA1234567"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Passport Expiry Date</label>
                  <input
                    type="date"
                    name="passportExpiryDate"
                    value={formData.passportExpiryDate}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Work Permit No.</label>
                  <input
                    type="text"
                    name="workPermitNo"
                    placeholder="e.g., WP-12345"
                    value={formData.workPermitNo}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Work Permit Expiry Date</label>
                  <input
                    type="date"
                    name="workPermitExpiryDate"
                    value={formData.workPermitExpiryDate}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Certifications */}
          <div style={sectionCard}>
            <SectionHeader
              number="4"
              title="Certifications"
              subtitle="(6G, BOSIET, H2S, etc.)"
              right={
                <button
                  type="button"
                  onClick={addCertification}
                  style={{
                    background: "#fff",
                    border: "1px solid #ffc107",
                    color: "#664d03",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Certification
                </button>
              }
            />
            <div style={sectionBody}>
              {certifications.length === 0 ? (
                <div
                  style={{
                    background: "#f8f9fa",
                    border: "1px dashed #dee2e6",
                    borderRadius: "8px",
                    padding: "28px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#6c757d" }}>
                    No certifications added yet.
                  </div>
                  <div style={{ fontSize: "12px", color: "#adb5bd" }}>
                    Click "+ Add Certification" to add training records.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {certifications.map((cert, index) => (
                    <div
                      key={cert.id}
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6c757d",
                          }}
                        >
                          Certification #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCertification(cert)}
                          style={{
                            background: "#fff",
                            border: "1px solid #f5c6cb",
                            color: "#842029",
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                      <div style={grid3}>
                        <div>
                          <label style={labelStyle}>
                            Training / Certification
                          </label>
                          <select
                            value={cert.globalTrainingId}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "globalTrainingId",
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                          >
                            <option value="">— Select from list —</option>
                            {globalTrainings.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                                {t.fullName ? ` - ${t.fullName}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Issued Date</label>
                          <input
                            type="date"
                            value={cert.completedDate}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "completedDate",
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Expiry Date</label>
                          <input
                            type="date"
                            value={cert.expiryDate}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "expiryDate",
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Medical */}
          <div style={sectionCard}>
            <SectionHeader number="5" title="Medical Check-up Record" accent />
            <div style={sectionBody}>
              <div style={{ ...grid3, marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Hospital / Clinic</label>
                  <input
                    type="text"
                    name="hospital"
                    placeholder="e.g., Bangkok Hospital"
                    value={medicalData.hospital}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Examination Date</label>
                  <input
                    type="date"
                    name="issuedDate"
                    value={medicalData.issuedDate}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={medicalData.expiryDate}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={grid3}>
                <div>
                  <label style={labelStyle}>Medical Status</label>
                  <select
                    name="status"
                    value={medicalData.status}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  >
                    <option value="">— Select —</option>
                    <option value="passed">Fit</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Unfit</option>
                    <option value="not_required">Fit with Restriction</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Confined Space Medical</label>
                  <select
                    name="confinedSpaceStatus"
                    value={medicalData.confinedSpaceStatus}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  >
                    <option value="">— N/A / Not assessed —</option>
                    <option value="passed">Fit</option>
                    <option value="failed">Unfit</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="Restrictions, remarks..."
                    value={medicalData.notes}
                    onChange={handleMedicalChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              paddingBottom: "40px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/admin/workers")}
              disabled={submitting}
              style={{
                padding: "9px 24px",
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
              type="submit"
              disabled={submitting}
              style={{
                padding: "9px 24px",
                fontSize: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#0d6efd",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Updating..." : "Update Worker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
