import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";
// import { DIVISIONS } from "../../constants/divisions";

// แปลง "YYYY-MM-DD" -> "DD/MM/YYYY" สำหรับแสดงผลในตาราง
const formatDateDisplay = (val) => {
  if (!val) return "—";
  const parts = val.split("-");
  if (parts.length !== 3) return val;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

export default function AddWorker() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);

  const [positions, setPositions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [certifications, setCertifications] = useState([]);
  const [globalTrainings, setGlobalTrainings] = useState([]);
  // id (local) ของ certification ที่กำลังเปิด form แก้ไขอยู่ — null = ไม่มีใคร edit อยู่ (โหมดตาราง)
  const [editingCertId, setEditingCertId] = useState(null);

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
    // ── Personal Details for CV (ใหม่) ──
    address: "",
    gender: "",
    height: "",
    weight: "",
    religion: "",
    language: "",
    education: "",
  });

  const [medicalData, setMedicalData] = useState({
    hospital: "",
    issuedDate: "",
    expiryDate: "",
    status: "",
    confinedSpaceStatus: "",
    notes: "",
  });

  // ── Tabs: จัดกลุ่ม section ให้ไม่รกเกินไป (เข้าชุดเดียวกับ EditWorker.jsx) ──
  const [activeTab, setActiveTab] = useState("profile");

  // ── Photo upload ──
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [deployments, setDeployments] = useState([]);
  // id (local) ของ deployment ที่กำลังเปิด form แก้ไขอยู่ — null = ไม่มีใคร edit อยู่ (โหมดตาราง)
  const [editingDeploymentId, setEditingDeploymentId] = useState(null);

  const addDeployment = () => {
    const newId = Date.now();
    setDeployments((prev) => [
      ...prev,
      {
        id: newId,
        client: "",
        field: "",
        positionId: "",
        platform: "",
        mobDate: "",
        demobDate: "",
      },
    ]);
    // เปิด form ให้กรอกทันที
    setEditingDeploymentId(newId);
  };
  const composeProjectLabel = (client, field, platform) => {
    if (!client) return "";
    if (field) return `Supply Manpower for ${client} : ${field}`;
    if (platform) return `Supply Manpower for ${client} at ${platform}`;
    return `Supply Manpower for ${client}`;
  };
  const removeDeployment = (depId) => {
    setDeployments((prev) => prev.filter((d) => d.id !== depId));
    if (editingDeploymentId === depId) setEditingDeploymentId(null);
  };
  const handleDeploymentChange = (localId, field, value) =>
    setDeployments((prev) =>
      prev.map((d) => (d.id === localId ? { ...d, [field]: value } : d)),
    );

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        const trainingRes = await axios.get(
          `${backendUrl}/api/trainings/global`,
          { withCredentials: true },
        );
        setPositions(posData);
        setGlobalTrainings(trainingRes.data);
      } catch {
        setPositions([]);
        setGlobalTrainings([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/divisions`, { withCredentials: true })
      .then((res) => setDivisions(res.data.map((d) => d.name)))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  // prefill empCode ด้วยรหัส EXPT ถัดไปจาก backend
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/workers/next-code`, { withCredentials: true })
      .then((res) =>
        setFormData((prev) => ({ ...prev, empCode: res.data.nextCode })),
      )
      .catch((err) => console.error(err));
  }, [backendUrl]);

  const addCertification = () => {
    const newId = Date.now();
    setCertifications((prev) => [
      ...prev,
      {
        id: newId,
        globalTrainingId: "",
        completedDate: "",
        expiryDate: "",
      },
    ]);
    // เปิด form ให้กรอกทันที
    setEditingCertId(newId);
  };
  const removeCertification = (id) => {
    setCertifications((prev) => prev.filter((c) => c.id !== id));
    if (editingCertId === id) setEditingCertId(null);
  };
  const handleCertChange = (id, field, value) =>
    setCertifications((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
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
      const { data: newWorker } = await axios.post(
        `${backendUrl}/api/workers`,
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
          // ── Personal Details for CV (ใหม่) ──
          address: formData.address || null,
          gender: formData.gender || null,
          height: formData.height === "" ? null : formData.height,
          weight: formData.weight === "" ? null : formData.weight,
          religion: formData.religion || null,
          language: formData.language || null,
          education: formData.education || null,
        },
        { withCredentials: true },
      );

      if (formData.passportNumber || formData.passportExpiryDate) {
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/passport`,
          {
            passportNo: formData.passportNumber || null,
            expiryDate: formData.passportExpiryDate || null,
            workPermitNo: formData.workPermitNo || null,
            workPermitExpiryDate: formData.workPermitExpiryDate || null,
          },
          { withCredentials: true },
        );
      }
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/photo`,
          fd,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }
      for (const cert of certifications) {
        if (!cert.globalTrainingId) continue;
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/trainings`,
          {
            globalTrainingId: cert.globalTrainingId,
            completedDate: cert.completedDate || null,
            expiryDate: cert.expiryDate || null,
            source: "manual",
          },
          { withCredentials: true },
        );
      }

      for (const dep of deployments) {
        if (!dep.client && !dep.mobDate) continue;
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/deployments`,
          {
            projectLabel: composeProjectLabel(
              dep.client,
              dep.field,
              dep.platform,
            ),
            positionId: dep.positionId || null,
            platform: dep.platform || null,
            mobDate: dep.mobDate || null,
            demobDate: dep.demobDate || null,
          },
          { withCredentials: true },
        );
      }
      if (
        medicalData.hospital ||
        medicalData.issuedDate ||
        medicalData.status
      ) {
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/medical`,
          {
            checkType: "Medical Check up",
            hospital: medicalData.hospital || null,
            issuedDate: medicalData.issuedDate || null,
            expiryDate: medicalData.expiryDate || null,
            status: medicalData.status || "pending",
            notes: medicalData.notes || null,
          },
          { withCredentials: true },
        );
      }
      if (
        medicalData.confinedSpaceStatus &&
        medicalData.confinedSpaceStatus !== ""
      ) {
        await axios.post(
          `${backendUrl}/api/workers/${newWorker.id}/medical`,
          {
            checkType: "Confined Space Entry",
            hospital: medicalData.hospital || null,
            issuedDate: medicalData.issuedDate || null,
            expiryDate: medicalData.expiryDate || null,
            status: medicalData.confinedSpaceStatus,
            notes: medicalData.notes || null,
          },
          { withCredentials: true },
        );
      }
      navigate("/workers");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create worker.");
    } finally {
      setSubmitting(false);
    }
  };

  // Shared styles
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

  // ── Table styles สำหรับ Certifications / Past Deployment History ──
  const depTable = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  };
  const depTh = {
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    padding: "8px 10px",
    borderBottom: "2px solid #dee2e6",
    whiteSpace: "nowrap",
  };
  const depTd = {
    padding: "10px",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  };
  const depBtn = {
    background: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "pointer",
    marginRight: "6px",
  };
  const depBtnDanger = {
    ...depBtn,
    border: "1px solid #f5c6cb",
    color: "#842029",
    marginRight: 0,
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

  // ตัวเลือก Position — โชว์ทุกตำแหน่ง (เพิ่มคนใหม่อาจเป็นคนแรกของตำแหน่งนั้น) + ค้นหาได้
  const positionOptions = positions.map((p) => ({
    value: p.id,
    label: `${p.name}${p._count ? ` (${p._count.employees})` : ""}`,
  }));
  const positionNameById = (posId) =>
    positions.find((p) => p.id === posId)?.name || "—";

  const trainingNameById = (trainingId) => {
    const t = globalTrainings.find((t) => t.id === trainingId);
    if (!t) return <span style={{ color: "#adb5bd" }}>—</span>;
    return `${t.name}${t.fullName ? ` - ${t.fullName}` : ""}`;
  };

  // const departmentOptions = DIVISIONS.map((d) => ({ value: d, label: d }));
  const departmentOptions = divisions.map((d) => ({ value: d, label: d }));

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="container-fluid p-0">
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
                Add New Worker
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
                Phase 1
              </span>
            </div>
            <span style={{ fontSize: "13px", color: "#6c757d" }}>
              Worker Application & Data Entry
            </span>
          </div>
          <button
            onClick={() => navigate("/workers")}
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

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: "2px solid #dee2e6",
            marginBottom: "1.5rem",
          }}
        >
          {[
            ["profile", "👤 Profile & Status"],
            ["documents", "📄 Documents & Compliance"],
            ["cv", "📋 CV / Resume Info"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: activeTab === key ? 700 : 500,
                border: "none",
                borderBottom:
                  activeTab === key
                    ? "2px solid #0d6efd"
                    : "2px solid transparent",
                marginBottom: "-2px",
                background: "none",
                cursor: "pointer",
                color: activeTab === key ? "#0d6efd" : "#6c757d",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === "profile" && (
            <>
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
                        Employee Code{" "}
                        <span style={{ color: "#dc3545" }}>*</span>
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
                        noOptionsMessage={() => "ไม่มีตำแหน่ง"}
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
            </>
          )}

          {activeTab === "cv" && (
            <>
              {/* Section P: Personal Details for CV (ใหม่) */}
              <div style={sectionCard}>
                <SectionHeader
                  number="P"
                  title="Personal Details for CV"
                  subtitle="(ใช้ตอน Generate CV Summary — Allocation)"
                />
                <div style={sectionBody}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={labelStyle}>Address</label>
                    <textarea
                      name="address"
                      rows={2}
                      placeholder="e.g., 575/2 Moo.12 Tambon Tha Rong, Wichian Buri District, Phetchabun Province, Thailand"
                      value={formData.address}
                      onChange={handleChange}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                  <div style={{ ...grid3, marginBottom: "16px" }}>
                    <div>
                      <label style={labelStyle}>Sex</label>
                      <Select
                        options={genderOptions}
                        value={
                          genderOptions.find(
                            (o) => o.value === formData.gender,
                          ) || null
                        }
                        onChange={(o) =>
                          setFormData((prev) => ({
                            ...prev,
                            gender: o ? o.value : "",
                          }))
                        }
                        placeholder="— Select —"
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
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Height (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="height"
                        placeholder="e.g., 163.2"
                        value={formData.height}
                        onChange={handleChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="weight"
                        placeholder="e.g., 69"
                        value={formData.weight}
                        onChange={handleChange}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ ...grid3, marginBottom: "16px" }}>
                    <div>
                      <label style={labelStyle}>Religion</label>
                      <input
                        type="text"
                        name="religion"
                        placeholder="e.g., Buddhism"
                        value={formData.religion}
                        onChange={handleChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Language</label>
                      <input
                        type="text"
                        name="language"
                        placeholder="e.g., Moderate command in English"
                        value={formData.language}
                        onChange={handleChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Education</label>
                      <input
                        type="text"
                        name="education"
                        placeholder="e.g., Secondary School"
                        value={formData.education}
                        onChange={handleChange}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Photo</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      {photoPreview && (
                        <img
                          src={photoPreview}
                          alt="preview"
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #dee2e6",
                          }}
                        />
                      )}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handlePhotoChange}
                        style={{ fontSize: "13px" }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginTop: "4px",
                      }}
                    >
                      รองรับ .jpg, .jpeg, .png, .webp — ขนาดไม่เกิน 5MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Section D: Past Deployment History — ตาราง + edit/remove */}
              <div style={sectionCard}>
                <SectionHeader
                  number="D"
                  title="Past Deployment History"
                  subtitle="(Project References ในเรซูเม่ — ถ้ามีประวัติเก่าก่อนเข้าระบบ)"
                  right={
                    <button
                      type="button"
                      onClick={addDeployment}
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
                      + Add Past Deployment
                    </button>
                  }
                />
                <div style={sectionBody}>
                  {deployments.length === 0 ? (
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
                        No past deployment records yet.
                      </div>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={depTable}>
                        <thead>
                          <tr>
                            <th style={depTh}>Client / Project</th>
                            <th style={depTh}>Field / Platform</th>
                            <th style={depTh}>Position</th>
                            <th style={depTh}>MOB Date</th>
                            <th style={depTh}>D-MOB Date</th>
                            <th style={{ ...depTh, textAlign: "right" }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {deployments.map((dep, index) =>
                            editingDeploymentId === dep.id ? (
                              // ── โหมด Edit: ขยายเป็น form เต็มในแถวเดียว ──
                              <tr key={dep.id}>
                                <td colSpan={6} style={depTd}>
                                  <div
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
                                        Deployment #{index + 1}
                                      </span>
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingDeploymentId(null)
                                          }
                                          style={{
                                            ...depBtn,
                                            borderColor: "#0d6efd",
                                            color: "#0d6efd",
                                          }}
                                        >
                                          ✓ Done
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeDeployment(dep.id)
                                          }
                                          style={depBtnDanger}
                                        >
                                          ✕ Remove
                                        </button>
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        ...grid2,
                                        marginBottom: "12px",
                                      }}
                                    >
                                      <div>
                                        <label style={labelStyle}>Client</label>
                                        <input
                                          type="text"
                                          value={dep.client}
                                          onChange={(e) =>
                                            handleDeploymentChange(
                                              dep.id,
                                              "client",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="e.g., Chevron"
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label style={labelStyle}>
                                          Field / Site (optional)
                                        </label>
                                        <input
                                          type="text"
                                          value={dep.field}
                                          onChange={(e) =>
                                            handleDeploymentChange(
                                              dep.id,
                                              "field",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="e.g., FDS Construction Benchams Field: B8/32"
                                          style={inputStyle}
                                        />
                                      </div>
                                    </div>

                                    {dep.client && (
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#0d6efd",
                                          background: "#f0f7ff",
                                          borderRadius: "6px",
                                          padding: "6px 10px",
                                          marginBottom: "12px",
                                        }}
                                      >
                                        Preview: "
                                        {composeProjectLabel(
                                          dep.client,
                                          dep.field,
                                          dep.platform,
                                        )}
                                        "
                                      </div>
                                    )}

                                    <div style={grid3}>
                                      <div>
                                        <label style={labelStyle}>
                                          Position (ตอนนั้น)
                                        </label>
                                        <Select
                                          options={positionOptions}
                                          value={
                                            positionOptions.find(
                                              (o) => o.value === dep.positionId,
                                            ) || null
                                          }
                                          onChange={(o) =>
                                            handleDeploymentChange(
                                              dep.id,
                                              "positionId",
                                              o ? o.value : "",
                                            )
                                          }
                                          placeholder="เลือกตำแหน่ง..."
                                          isClearable
                                          menuPortalTarget={
                                            typeof document !== "undefined"
                                              ? document.body
                                              : null
                                          }
                                          menuPosition="fixed"
                                          styles={{
                                            menuPortal: (b) => ({
                                              ...b,
                                              zIndex: 1000000,
                                            }),
                                            control: (b) => ({
                                              ...b,
                                              fontSize: "13px",
                                              minHeight: "38px",
                                            }),
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label style={labelStyle}>
                                          MOB Date
                                        </label>
                                        <input
                                          type="date"
                                          value={dep.mobDate}
                                          onChange={(e) =>
                                            handleDeploymentChange(
                                              dep.id,
                                              "mobDate",
                                              e.target.value,
                                            )
                                          }
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label style={labelStyle}>
                                          D-MOB Date
                                        </label>
                                        <input
                                          type="date"
                                          value={dep.demobDate}
                                          onChange={(e) =>
                                            handleDeploymentChange(
                                              dep.id,
                                              "demobDate",
                                              e.target.value,
                                            )
                                          }
                                          style={inputStyle}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ marginTop: "12px" }}>
                                      <label style={labelStyle}>
                                        Platform (optional เช่น BELQ, C5)
                                      </label>
                                      <input
                                        type="text"
                                        value={dep.platform}
                                        onChange={(e) =>
                                          handleDeploymentChange(
                                            dep.id,
                                            "platform",
                                            e.target.value,
                                          )
                                        }
                                        style={{
                                          ...inputStyle,
                                          maxWidth: "200px",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              // ── โหมดปกติ: แถวตารางแบบ compact ──
                              <tr key={dep.id}>
                                <td style={depTd}>
                                  {dep.client || (
                                    <span style={{ color: "#adb5bd" }}>—</span>
                                  )}
                                </td>
                                <td style={depTd}>
                                  {dep.field || dep.platform || (
                                    <span style={{ color: "#adb5bd" }}>—</span>
                                  )}
                                </td>
                                <td style={depTd}>
                                  {positionNameById(dep.positionId)}
                                </td>
                                <td style={depTd}>
                                  {formatDateDisplay(dep.mobDate)}
                                </td>
                                <td style={depTd}>
                                  {formatDateDisplay(dep.demobDate)}
                                </td>
                                <td style={{ ...depTd, textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingDeploymentId(dep.id)
                                    }
                                    style={depBtn}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDeployment(dep.id)}
                                    style={depBtnDanger}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "profile" && (
            <>
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            availabilityStatus: value,
                            mobilizationStatus:
                              value === "unavailable"
                                ? "on_site"
                                : prev.mobilizationStatus === "on_site"
                                  ? "pending"
                                  : prev.mobilizationStatus,
                          }));
                        }}
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            mobilizationStatus: value,
                            availabilityStatus:
                              value === "on_site" ? "unavailable" : "available",
                          }));
                        }}
                        style={inputStyle}
                      >
                        {formData.availabilityStatus === "unavailable" ? (
                          <option value="on_site">On-Site</option>
                        ) : (
                          <>
                            <option value="pending">Pending</option>
                            <option value="ready">Ready</option>
                          </>
                        )}
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
            </>
          )}

          {activeTab === "documents" && (
            <>
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

              {/* Section 4: Certifications — ตาราง + edit/remove */}
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
                    <div style={{ overflowX: "auto" }}>
                      <table style={depTable}>
                        <thead>
                          <tr>
                            <th style={depTh}>Training / Certification</th>
                            <th style={depTh}>Issued Date</th>
                            <th style={depTh}>Expiry Date</th>
                            <th style={{ ...depTh, textAlign: "right" }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {certifications.map((cert, index) =>
                            editingCertId === cert.id ? (
                              // ── โหมด Edit: ขยายเป็น form เต็มในแถวเดียว ──
                              <tr key={cert.id}>
                                <td colSpan={4} style={depTd}>
                                  <div
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
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setEditingCertId(null)}
                                          style={{
                                            ...depBtn,
                                            borderColor: "#0d6efd",
                                            color: "#0d6efd",
                                          }}
                                        >
                                          ✓ Done
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeCertification(cert.id)
                                          }
                                          style={depBtnDanger}
                                        >
                                          ✕ Remove
                                        </button>
                                      </div>
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
                                          <option value="">
                                            — Select from list —
                                          </option>
                                          {globalTrainings.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {t.name}
                                              {t.fullName
                                                ? ` - ${t.fullName}`
                                                : ""}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label style={labelStyle}>
                                          Issued Date
                                        </label>
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
                                        <label style={labelStyle}>
                                          Expiry Date
                                        </label>
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
                                </td>
                              </tr>
                            ) : (
                              // ── โหมดปกติ: แถวตารางแบบ compact ──
                              <tr key={cert.id}>
                                <td style={depTd}>
                                  {trainingNameById(cert.globalTrainingId)}
                                </td>
                                <td style={depTd}>
                                  {formatDateDisplay(cert.completedDate)}
                                </td>
                                <td style={depTd}>
                                  {formatDateDisplay(cert.expiryDate)}
                                </td>
                                <td style={{ ...depTd, textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCertId(cert.id)}
                                    style={depBtn}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeCertification(cert.id)}
                                    style={depBtnDanger}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Medical */}
              <div style={sectionCard}>
                <SectionHeader
                  number="5"
                  title="Medical Check-up Record"
                  accent
                />
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
                        <option value="not_required">
                          Fit with Restriction
                        </option>
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
            </>
          )}

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
              onClick={() => navigate("/workers")}
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
              {submitting ? "Saving..." : "Save Worker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
