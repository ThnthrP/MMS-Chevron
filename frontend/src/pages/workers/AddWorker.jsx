import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function AddWorker() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);

  const [positions, setPositions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [certifications, setCertifications] = useState([]);
  const [globalTrainings, setGlobalTrainings] = useState([]);

  const [formData, setFormData] = useState({
    empCode: "",
    fullName: "",
    nationality: "",

    positionId: "",
    division: "",
    startWorkDate: "",
    status: "active",
    availabilityStatus: "available",
    mobilizationStatus: "pending",
    isOffshore: false,

    passportNumber: "",
    passportExpiryDate: "",

    workPermitNo: "",
    workPermitExpiryDate: "",

    phone: "",
    email: "",

    notes: "",
  });

  const [medicalData, setMedicalData] = useState({
    hospital: "",
    issuedDate: "",
    expiryDate: "",
    status: "",
    confinedSpaceStatus: "",
    notes: "",
  });

  const divisions = [
    "Fabrication",
    "Operations",
    "Civil",
    "Electrical",
    "HSE",
    "Mechanical",
    "Engineering",
    "Scaffold&Paint",
    "Maintenance&EQ",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [posRes, trainingRes] = await Promise.all([
          axios.get(`${backendUrl}/api/positions`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/trainings/global`, {
            withCredentials: true,
          }),
        ]);
        setPositions(posRes.data);
        setGlobalTrainings(trainingRes.data);
      } catch {
        setPositions([]);
        setGlobalTrainings([]);
      }
    };
    fetchData();
  }, []);

  const addCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        globalTrainingId: "",
        completedDate: "",
        expiryDate: "",
      },
    ]);
  };

  const removeCertification = (id) => {
    setCertifications((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCertChange = (id, field, value) => {
    setCertifications((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

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
          positionId: formData.positionId || null,
          division: formData.division || null,
          startWorkDate: formData.startWorkDate || null,
          status: formData.status,
          availabilityStatus: formData.availabilityStatus,
          mobilizationStatus: formData.mobilizationStatus,
          isOffshore: formData.isOffshore,
          notes: formData.notes || null,
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

      // 3) สร้าง Certifications
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

      // 4) สร้าง Medical Check records
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

      navigate("/admin/workers");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create worker.");
    } finally {
      setSubmitting(false);
    }
  };

  // Section header component
  const SectionHeader = ({ number, title }) => (
    <div className="card-header bg-white border-bottom py-3 px-4">
      <div className="d-flex align-items-center gap-2">
        <div
          className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
          style={{
            width: "28px",
            height: "28px",
            fontSize: "13px",
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <span className="fw-semibold text-dark" style={{ fontSize: "15px" }}>
          {title}
        </span>
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h4 className="fw-bold text-dark mb-1">Add New Worker</h4>
            <div className="d-flex align-items-center gap-2 mt-1">
              <span
                className="badge fw-semibold px-2 py-1"
                style={{
                  fontSize: "11px",
                  background: "#e8f0fe",
                  color: "#1a56db",
                }}
              >
                Phase 1
              </span>
              <span className="text-muted" style={{ fontSize: "13px" }}>
                Worker Application & Data Entry
              </span>
            </div>
          </div>
          <button
            className="btn btn-outline-secondary btn-sm px-3"
            onClick={() => navigate("/admin/workers")}
          >
            ← Back
          </button>
        </div>

        {error && (
          <div
            className="alert alert-danger py-2 mb-4"
            style={{ fontSize: "13px" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── Section 1: Basic Information ── */}
          {/* ── Section 1: Basic Information ── */}
          <div className="card border-0 shadow-sm mb-4 overflow-hidden">
            <SectionHeader number="1" title="Basic Information" />
            <div className="card-body p-4">
              {/* Employee Code + Full Name */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Employee Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="empCode"
                    placeholder="e.g., PTT-0001"
                    value={formData.empCode}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-8">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Full Name (as per Passport){" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="fullName"
                    placeholder="e.g., Somchai Jaidee"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Nationality */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Nationality
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="nationality"
                    placeholder="e.g., Thai, Filipino"
                    value={formData.nationality}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Position + Department */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Position / Trade
                  </label>
                  <select
                    className="form-select"
                    name="positionId"
                    value={formData.positionId}
                    onChange={handleChange}
                  >
                    <option value="">— Select Position —</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Department
                  </label>
                  <select
                    className="form-select"
                    name="division"
                    value={formData.division}
                    onChange={handleChange}
                  >
                    <option value="">— Select Department —</option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Work Date */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Start Work Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="startWorkDate"
                    value={formData.startWorkDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Phone + Email */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Phone
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    placeholder="+66 xx xxx xxxx"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    placeholder="worker@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="row g-3">
                <div className="col-12">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Notes
                  </label>
                  <textarea
                    className="form-control"
                    name="notes"
                    rows={3}
                    placeholder="Additional notes, restrictions, or remarks..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Worker Status ── */}
          <div className="card border-0 shadow-sm mb-4 overflow-hidden">
            <SectionHeader number="2" title="Worker Status" />
            <div className="card-body p-4">
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Employee Status
                  </label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Availability
                  </label>
                  <select
                    className="form-select"
                    name="availabilityStatus"
                    value={formData.availabilityStatus}
                    onChange={handleChange}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Mobilization Status
                  </label>
                  <select
                    className="form-select"
                    name="mobilizationStatus"
                    value={formData.mobilizationStatus}
                    onChange={handleChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="ready">Ready</option>
                    <option value="on_site">On-Site</option>
                  </select>
                </div>
              </div>

              {/* Offshore */}
              <div
                className="p-3 rounded d-flex align-items-start gap-3"
                style={{ background: "#f8f9fa", border: "1px solid #e9ecef" }}
              >
                <input
                  type="checkbox"
                  className="form-check-input mt-1"
                  id="isOffshore"
                  name="isOffshore"
                  checked={formData.isOffshore}
                  onChange={handleChange}
                  style={{ flexShrink: 0 }}
                />
                <label htmlFor="isOffshore" style={{ cursor: "pointer" }}>
                  <div
                    className="fw-semibold text-dark"
                    style={{ fontSize: "14px" }}
                  >
                    Offshore Worker
                  </div>
                  <div className="text-muted" style={{ fontSize: "12px" }}>
                    Check if this worker is deployed to offshore locations
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* ── Section 3: Passport Information ── */}
          <div className="card border-0 shadow-sm mb-4 overflow-hidden">
            <SectionHeader number="3" title="Passport Information" />
            <div className="card-body p-4">
              {/* Passport */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Passport Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="passportNumber"
                    placeholder="e.g., AA1234567"
                    value={formData.passportNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Passport Expiry Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="passportExpiryDate"
                    value={formData.passportExpiryDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Work Permit */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Work Permit No.
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="workPermitNo"
                    placeholder="e.g., WP-12345"
                    value={formData.workPermitNo}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Work Permit Expiry Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="workPermitExpiryDate"
                    value={formData.workPermitExpiryDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Certifications ── */}
          <div className="card border-0 shadow-sm mb-4 overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: "28px",
                    height: "28px",
                    fontSize: "13px",
                    flexShrink: 0,
                  }}
                >
                  4
                </div>
                <span
                  className="fw-semibold text-dark"
                  style={{ fontSize: "15px" }}
                >
                  Certifications
                </span>
                <span className="text-muted" style={{ fontSize: "12px" }}>
                  (6G, BOSIET, H2S, etc.)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-warning fw-semibold px-3"
                onClick={addCertification}
              >
                + Add Certification
              </button>
            </div>

            <div className="card-body p-4">
              {certifications.length === 0 ? (
                <div
                  className="text-center py-4 rounded"
                  style={{
                    background: "#f8f9fa",
                    border: "1px dashed #dee2e6",
                  }}
                >
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    No certifications added yet.
                  </div>
                  <div className="text-muted" style={{ fontSize: "12px" }}>
                    Click "+ Add Certification" to add training records.
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {certifications.map((cert, index) => (
                    <div
                      key={cert.id}
                      className="p-3 rounded"
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #e9ecef",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span
                          className="fw-semibold text-secondary"
                          style={{ fontSize: "12px" }}
                        >
                          Certification #{index + 1}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger px-2 py-0"
                          style={{ fontSize: "12px" }}
                          onClick={() => removeCertification(cert.id)}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="row g-3">
                        {/* Select Training */}
                        <div className="col-md-6">
                          <label
                            className="form-label fw-semibold text-secondary"
                            style={{ fontSize: "13px" }}
                          >
                            Training / Certification
                          </label>
                          <select
                            className="form-select"
                            value={cert.globalTrainingId}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "globalTrainingId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">— Select from list —</option>
                            {globalTrainings.map((t) => {
                              console.log(t);
                              return (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                  {t.fullName ? ` - ${t.fullName}` : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Issued Date */}
                        <div className="col-md-3">
                          <label
                            className="form-label fw-semibold text-secondary"
                            style={{ fontSize: "13px" }}
                          >
                            Issued Date
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            value={cert.completedDate}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "completedDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {/* Expiry Date */}
                        <div className="col-md-3">
                          <label
                            className="form-label fw-semibold text-secondary"
                            style={{ fontSize: "13px" }}
                          >
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            value={cert.expiryDate}
                            onChange={(e) =>
                              handleCertChange(
                                cert.id,
                                "expiryDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 5: Medical Check-up Record ── */}
          <div className="card border-0 shadow-sm mb-4 overflow-hidden">
            <div
              className="card-header border-bottom py-3 px-4"
              style={{ background: "#fff5f5" }}
            >
              <div className="d-flex align-items-center gap-2">
                <div
                  className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: "28px",
                    height: "28px",
                    fontSize: "13px",
                    flexShrink: 0,
                    background: "#e53e3e",
                  }}
                >
                  5
                </div>
                <span
                  className="fw-semibold"
                  style={{ fontSize: "15px", color: "#c53030" }}
                >
                  Medical Check-up Record
                </span>
              </div>
            </div>

            <div className="card-body p-4">
              {/* Hospital + Examination Date + Expiry Date */}
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Hospital / Clinic
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="hospital"
                    placeholder="e.g., Bangkok Hospital"
                    value={medicalData.hospital}
                    onChange={handleMedicalChange}
                  />
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Examination Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="issuedDate"
                    value={medicalData.issuedDate}
                    onChange={handleMedicalChange}
                  />
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="expiryDate"
                    value={medicalData.expiryDate}
                    onChange={handleMedicalChange}
                  />
                </div>
              </div>

              {/* Medical Status + Confined Space + Notes */}
              <div className="row g-3">
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Medical Status
                  </label>
                  <select
                    className="form-select"
                    name="status"
                    value={medicalData.status}
                    onChange={handleMedicalChange}
                  >
                    <option value="">— Select —</option>
                    <option value="passed">Fit</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Unfit</option>
                    <option value="not_required">Fit with Restriction</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Confined Space Medical
                  </label>
                  <select
                    className="form-select"
                    name="confinedSpaceStatus"
                    value={medicalData.confinedSpaceStatus}
                    onChange={handleMedicalChange}
                  >
                    <option value="">— N/A / Not assessed —</option>
                    <option value="passed">Fit</option>
                    <option value="failed">Unfit</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label
                    className="form-label fw-semibold text-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Notes
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="notes"
                    placeholder="Restrictions, remarks..."
                    value={medicalData.notes}
                    onChange={handleMedicalChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="d-flex justify-content-end gap-2 pb-5">
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={() => navigate("/admin/workers")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Saving...
                </>
              ) : (
                "Save Worker"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
