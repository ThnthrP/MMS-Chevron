import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import Select from "react-select"; // 💡 นำเข้า react-select เพื่อทำกล่องเลือกที่พิมพ์ค้นหาได้

export default function Workers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [availability, setAvailability] = useState("");
  const [mobilization, setMobilization] = useState("");

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { backendUrl } = useContext(AppContent);

  const navigate = useNavigate();

  // ==========================
  // ของเดิมคงไว้: ดึงข้อมูลและจัดการ Options
  // ==========================
  const departments = [
    ...new Set(workers.map((w) => w.division).filter(Boolean)),
  ];

  const positions = [
    ...new Set(workers.map((w) => w.position?.name).filter(Boolean)),
  ];

  // 💡 จัดรูปแบบตัวเลือกให้อยู่ใน Format ของ React-Select ( { value, label } )
  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...departments.map((dept) => ({ value: dept, label: dept })),
  ];

  const positionOptions = [
    { value: "", label: "All Positions" },
    ...positions.map((pos) => ({ value: pos, label: pos })),
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const availabilityOptions = [
    { value: "", label: "All Availability" },
    { value: "available", label: "Available" },
    { value: "unavailable", label: "Unavailable" },
  ];

  const mobilizationOptions = [
    { value: "", label: "All Mobilization" },
    { value: "pending", label: "Pending" },
    { value: "ready", label: "Ready" },
    { value: "on_site", label: "On-Site" },
  ];

  // ==========================
  // Filter & Logic
  // ==========================
  const filteredWorkers = workers.filter((worker) => {
    const matchSearch =
      (worker.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (worker.empCode || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = !status || worker.status === status;
    const matchDepartment = !department || worker.division === department;
    const matchPosition = !position || worker.position?.name === position;
    const matchAvailability =
      !availability || worker.availabilityStatus === availability;

    const matchMobilization =
      !mobilization || worker.mobilizationStatus === mobilization;

    return (
      matchSearch &&
      matchStatus &&
      matchDepartment &&
      matchPosition &&
      matchAvailability &&
      matchMobilization
    );
  });

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.status === "active").length;
  const inactiveWorkers = workers.filter((w) => w.status !== "active").length;

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-success text-dark fw-bold";
      case "inactive":
        return "bg-secondary text-dark fw-bold";
      default:
        return "bg-warning text-dark fw-bold";
    }
  };

  const getAvailabilityBadge = (availability) => {
    switch (availability) {
      case "available":
        return "bg-success text-dark fw-bold";
      case "unavailable":
        return "bg-danger text-dark fw-bold";
      default:
        return "bg-secondary text-dark fw-bold";
    }
  };

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/workers`, {
        withCredentials: true,
      });
      setWorkers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/workers`, {
        withCredentials: true,
      });
      setWorkers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadWorkers();
    fetchWorkers();
  }, []);

  // 💡 ตกแต่งสไตล์กล่อง Select ของ React-Select ให้ขอบสวย มน และเท่ากับช่อง Search ทั่วไป
  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#dee2e6",
      borderRadius: "0.375rem",
      padding: "0.15rem 0",
      boxShadow: "none",
      "&:hover": { borderColor: "#86b7fe" },
    }),
  };

  const getMobilizationBadge = (mobilizationStatus) => {
    switch (mobilizationStatus) {
      case "ready":
        return "bg-success text-dark fw-bold";
      case "on_site":
        return "bg-primary text-white fw-bold";
      case "pending":
        return "bg-warning text-dark fw-bold";
      default:
        return "bg-secondary text-dark fw-bold";
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this worker?",
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${backendUrl}/api/workers/${id}`, {
        withCredentials: true,
      });

      fetchWorkers();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to deactivate worker");
    }
  };

  return (
    <div className="container-fluid p-0">
      <h3 className="mb-4 fw-bold text-dark">Workers</h3>

      <div className="card shadow-sm mb-4 border-0">
        <div className="card-body bg-white rounded">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)", // 👈 5 → 6
              gap: "1rem",
            }}
          >
            {/* Search */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Search
              </label>
              <input
                type="text"
                className="form-control"
                style={{ padding: "0.53rem 0.75rem" }}
                placeholder="Search worker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Department */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Department
              </label>
              <Select
                options={departmentOptions}
                styles={customSelectStyles}
                value={
                  departmentOptions.find((opt) => opt.value === department) ||
                  null
                }
                onChange={(selectedOpt) =>
                  setDepartment(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="All Departments"
                isClearable
                noOptionsMessage={() => "No departments found"}
              />
            </div>

            {/* Position */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Position
              </label>
              <Select
                options={positionOptions}
                styles={customSelectStyles}
                value={
                  positionOptions.find((opt) => opt.value === position) || null
                }
                onChange={(selectedOpt) =>
                  setPosition(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="All Positions"
                isClearable
                noOptionsMessage={() => "No positions found"}
              />
            </div>

            {/* Availability */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Availability
              </label>
              <Select
                options={availabilityOptions}
                styles={customSelectStyles}
                value={
                  availabilityOptions.find(
                    (opt) => opt.value === availability,
                  ) || null
                }
                onChange={(selectedOpt) =>
                  setAvailability(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="All Availability"
                isClearable
                isSearchable={false}
              />
            </div>

            {/* Status */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Status
              </label>
              <Select
                options={statusOptions}
                styles={customSelectStyles}
                value={
                  statusOptions.find((opt) => opt.value === status) || null
                }
                onChange={(selectedOpt) =>
                  setStatus(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="All Status"
                isClearable
                isSearchable={false}
              />
            </div>

            {/* Mobilization */}
            <div>
              <label className="form-label fw-semibold text-secondary">
                Mobilization
              </label>
              <Select
                options={mobilizationOptions}
                styles={customSelectStyles}
                value={
                  mobilizationOptions.find(
                    (opt) => opt.value === mobilization,
                  ) || null
                }
                onChange={(selectedOpt) =>
                  setMobilization(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="All Mobilization"
                isClearable
                isSearchable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Area */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
        className="mb-4"
      >
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <small className="text-muted text-uppercase fw-bold">
              Total Workers
            </small>
            <div className="fw-bold fs-4 mt-1 text-dark">{totalWorkers}</div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <small className="text-muted text-uppercase fw-bold">
              Active Workers
            </small>
            <div className="fw-bold fs-4 mt-1 text-success">
              {activeWorkers}
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <small className="text-muted text-uppercase fw-bold">
              Inactive Workers
            </small>
            <div className="fw-bold fs-4 mt-1 text-secondary">
              {inactiveWorkers}
            </div>
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            {/* 💡 เพิ่มคลาส `table-sm` เพื่อลด padding ตาราง และ `small` เพื่อลดขนาด font ทั้งตารางลงเหลือ ~14px (หรือใช้สไตล์ fontSize: "13px" ก็ได้ครับ) */}
            <table
              className="table table-sm table-hover align-middle mb-0 small"
              style={{ fontSize: "13px" }}
            >
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-dark fw-bold py-2 pe-3">Emp Code</th>
                  <th className="text-dark fw-bold py-2 pe-3">Name</th>
                  <th className="text-dark fw-bold py-2 pe-3">Position</th>
                  <th className="text-dark fw-bold py-2 pe-3">Department</th>
                  <th className="text-dark fw-bold text-center py-2 pe-3">
                    Availability
                  </th>
                  <th className="text-dark fw-bold text-center py-2 pe-3">
                    Status
                  </th>
                  <th className="text-dark fw-bold text-center py-2 pe-3">
                    Mobilization
                  </th>
                  <th
                    width="220"
                    className="text-dark fw-bold text-center pe-4 py-2 pe-4"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div
                        className="spinner-border spinner-border-sm text-primary me-2"
                        role="status"
                      ></div>
                      <span className="text-muted">
                        Loading workers data...
                      </span>
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker) => (
                    <tr key={worker.id}>
                      <td className="ps-4 fw-medium text-dark py-2 pe-3">
                        {worker.empCode}
                      </td>
                      <td className="text-dark py-2 pe-3">{worker.fullName}</td>
                      <td className="text-dark py-2 pe-3">
                        {worker.position?.name || "-"}
                      </td>
                      <td className="text-dark py-2 pe-3">
                        {worker.division || "-"}
                      </td>
                      <td className="text-center py-2 pe-3">
                        {/* 💡 ลด padding ของ badge ลงเป็น px-2 py-1 เพื่อให้พอดีกับตารางตัวเล็ก */}
                        <span
                          className={`badge ${getAvailabilityBadge(worker.availabilityStatus)} px-2 py-1`}
                          style={{ fontSize: "11px" }}
                        >
                          {worker.availabilityStatus}
                        </span>
                      </td>
                      <td className="text-center py-2 pe-3">
                        {/* 💡 ลด padding ของ badge ลงเป็น px-2 py-1 */}
                        <span
                          className={`badge ${getStatusBadge(worker.status)} px-2 py-1`}
                          style={{ fontSize: "11px" }}
                        >
                          {worker.status}
                        </span>
                      </td>
                      <td className="text-center py-2 pe-3">
                        <span
                          className={`badge ${getMobilizationBadge(worker.mobilizationStatus)} px-2 py-1`}
                          style={{ fontSize: "11px" }}
                        >
                          {worker.mobilizationStatus || "pending"}
                        </span>
                      </td>
                      <td className="text-center pe-3 py-2">
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary px-2 py-1"
                            style={{ fontSize: "12px" }}
                            onClick={() =>
                              navigate(`/admin/workers/${worker.id}`)
                            }
                          >
                            <i className="bi bi-eye me-1"></i>View
                          </button>

                          <button
                            className="btn btn-sm btn-outline-secondary px-2 py-1"
                            style={{ fontSize: "12px" }}
                            onClick={() =>
                              navigate(`/admin/workers/${worker.id}/edit`)
                            }
                          >
                            <i className="bi bi-pencil me-1"></i>Edit
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger px-2 py-1"
                            style={{ fontSize: "12px" }}
                            onClick={() => handleDelete(worker.id)}
                          >
                            <i className="bi bi-slash-circle me-1"></i>
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
