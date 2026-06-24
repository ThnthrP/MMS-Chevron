import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";

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

  const departments = [
    ...new Set(workers.map((w) => w.division).filter(Boolean)),
  ];
  const positions = [
    ...new Set(workers.map((w) => w.position?.name).filter(Boolean)),
  ];

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

  const filteredWorkers = workers
    .filter((worker) => {
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
    })
    .sort((a, b) =>
      (a.empCode || "").localeCompare(b.empCode || "", undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.status === "active").length;
  const inactiveWorkers = workers.filter((w) => w.status !== "active").length;

  const statusBadge = (bg, color, text) => (
    <span
      style={{
        display: "inline-block",
        minWidth: "90px",
        textAlign: "center",
        padding: "4px 10px",
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

  const renderStatus = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return statusBadge("#d1e7dd", "#0f5132", "Active");

      case "inactive":
        return statusBadge("#f8d7da", "#842029", "Inactive");

      default:
        return statusBadge("#f1f3f5", "#6c757d", status || "-");
    }
  };

  const renderAvailability = (status) => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return statusBadge("#d1e7dd", "#0f5132", "Available");

      case "unavailable":
        return statusBadge("#f8d7da", "#842029", "Unavailable");

      default:
        return statusBadge("#f1f3f5", "#6c757d", status || "-");
    }
  };

  const renderMobilization = (status) => {
    switch ((status || "").toLowerCase()) {
      case "ready":
        return statusBadge("#d1e7dd", "#0f5132", "Ready");

      case "on_site":
        return statusBadge("#e8f4fd", "#0a58ca", "On Site");

      case "pending":
        return statusBadge("#fff3cd", "#664d03", "Pending");

      default:
        return statusBadge("#f1f3f5", "#6c757d", status || "-");
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

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#dee2e6",
      borderRadius: "8px",
      minHeight: "36px",
      fontSize: "13px",
      boxShadow: "none",
      "&:hover": { borderColor: "#86b7fe" },
    }),
    option: (provided) => ({ ...provided, fontSize: "13px" }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "13px",
      color: "#6c757d",
    }),
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this worker?"))
      return;
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
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>👷</span>
              <span style={{ fontSize: "18px", fontWeight: 700 }}>Workers</span>
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
              <span style={{ color: "#6c757d", fontSize: "12px" }}>
                Recruitment & Data Entry
              </span>
            </div>
            <button
              onClick={() => navigate("/admin/workers/add")}
              style={{
                background: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Worker
            </button>
          </div>
        </div>

        {/* Search & Filter Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "14px 20px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {/* Search */}
            <div
              style={{
                position: "relative",
                flex: "1 1 220px",
                minWidth: "180px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#adb5bd",
                  fontSize: "14px",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Search name, ID, position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "34px",
                  paddingRight: "12px",
                  paddingTop: "7px",
                  paddingBottom: "7px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Department */}
            <div style={{ flex: "1 1 150px", minWidth: "130px" }}>
              <Select
                options={departmentOptions}
                styles={customSelectStyles}
                value={
                  departmentOptions.find((o) => o.value === department) || null
                }
                onChange={(o) => setDepartment(o ? o.value : "")}
                placeholder="All Departments"
                isClearable
                noOptionsMessage={() => "No departments found"}
              />
            </div>

            {/* Position */}
            <div style={{ flex: "1 1 150px", minWidth: "130px" }}>
              <Select
                options={positionOptions}
                styles={customSelectStyles}
                value={
                  positionOptions.find((o) => o.value === position) || null
                }
                onChange={(o) => setPosition(o ? o.value : "")}
                placeholder="All Positions"
                isClearable
                noOptionsMessage={() => "No positions found"}
              />
            </div>

            {/* Status */}
            <div style={{ flex: "1 1 120px", minWidth: "110px" }}>
              <Select
                options={statusOptions}
                styles={customSelectStyles}
                value={statusOptions.find((o) => o.value === status) || null}
                onChange={(o) => setStatus(o ? o.value : "")}
                placeholder="All Status"
                isClearable
                isSearchable={false}
              />
            </div>

            {/* Availability */}
            <div style={{ flex: "1 1 130px", minWidth: "120px" }}>
              <Select
                options={availabilityOptions}
                styles={customSelectStyles}
                value={
                  availabilityOptions.find((o) => o.value === availability) ||
                  null
                }
                onChange={(o) => setAvailability(o ? o.value : "")}
                placeholder="All Availability"
                isClearable
                isSearchable={false}
              />
            </div>

            {/* Mobilization */}
            <div style={{ flex: "1 1 130px", minWidth: "120px" }}>
              <Select
                options={mobilizationOptions}
                styles={customSelectStyles}
                value={
                  mobilizationOptions.find((o) => o.value === mobilization) ||
                  null
                }
                onChange={(o) => setMobilization(o ? o.value : "")}
                placeholder="All Mobilization"
                isClearable
                isSearchable={false}
              />
            </div>

            {/* Clear All */}
            {(search ||
              department ||
              position ||
              status ||
              availability ||
              mobilization) && (
              <button
                onClick={() => {
                  setSearch("");
                  setDepartment("");
                  setPosition("");
                  setStatus("");
                  setAvailability("");
                  setMobilization("");
                }}
                style={{
                  flexShrink: 0,
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid #f5c6cb",
                  borderRadius: "8px",
                  background: "#fff",
                  color: "#dc3545",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Total Workers
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: 700, color: "#212529" }}
            >
              {totalWorkers}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Active Workers
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: 700, color: "#198754" }}
            >
              {activeWorkers}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#6c757d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Inactive Workers
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: 700, color: "#6c757d" }}
            >
              {inactiveWorkers}
            </div>
          </div>
        </div>

        {/* Workers Table Card */}
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
              padding: "10px 16px",
              borderBottom: "1px solid #dee2e6",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ fontSize: "13px", color: "#6c757d" }}>
              {filteredWorkers.length} of {workers.length}
            </span>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  EMP CODE
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  NAME
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  POSITION
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  DEPARTMENT
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  AVAILABILITY
                </th>

                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  MOBILIZATION
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6c757d",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    width: "200px",
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    Loading workers data...
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker, idx) => (
                  <tr
                    key={worker.id}
                    style={{
                      borderBottom:
                        idx < filteredWorkers.length - 1
                          ? "1px solid #f1f3f5"
                          : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8f9fa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    <td
                      style={{
                        padding: "11px 16px",
                        fontWeight: 600,
                        color: "#6c757d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {worker.empCode}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span
                        style={{
                          color: "#0d6efd",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => navigate(`/admin/workers/${worker.id}`)}
                      >
                        {worker.fullName}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {worker.position?.name || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", color: "#6c757d" }}>
                      {worker.division || "—"}
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        textAlign: "center",
                      }}
                    >
                      {renderStatus(worker.status)}
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        textAlign: "center",
                      }}
                    >
                      {renderAvailability(worker.availabilityStatus)}
                    </td>

                    <td
                      style={{
                        padding: "11px 16px",
                        textAlign: "center",
                      }}
                    >
                      {renderMobilization(worker.mobilizationStatus)}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate(`/admin/workers/${worker.id}`)
                          }
                          style={{
                            background: "#fff",
                            border: "1px solid #dee2e6",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            lineHeight: 1,
                          }}
                        >
                          👁
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/admin/workers/${worker.id}/edit`)
                          }
                          style={{
                            background: "#fff",
                            border: "1px solid #dee2e6",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            lineHeight: 1,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(worker.id)}
                          style={{
                            background: "#fff",
                            border: "1px solid #f5c6cb",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            lineHeight: 1,
                          }}
                        >
                          🗑
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
  );
}
