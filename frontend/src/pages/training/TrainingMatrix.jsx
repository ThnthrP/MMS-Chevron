import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";

export default function TrainingMatrix() {
  const [contracts, setContracts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const { backendUrl } = useContext(AppContent);
  const [positionGroups, setPositionGroups] = useState([]);

  // ==========================
  // Load Contracts
  // ==========================
  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (!selectedContract) return;
    loadRequirements();
  }, [selectedContract, selectedPosition]);

  const fetchContracts = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/training-matrix/contracts`,
        { withCredentials: true },
      );
      setContracts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================
  // Load Positions
  // ==========================
  const fetchPositions = async (contractId) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/training-matrix/positions/${contractId}`,
        { withCredentials: true },
      );
      setPositions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================
  // Search Requirements
  // ==========================
  const loadRequirements = async () => {
    if (!selectedContract) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/training-matrix/requirements`,
        {
          withCredentials: true,
          params: {
            contractId: selectedContract,
            positionId: selectedPosition || undefined,
          },
        },
      );
      setPositionGroups(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 💡 จัดฟอร์แมตข้อมูลส่งให้ช่องพิมพ์ค้นหา Client (React Select)
  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // 💡 จัดฟอร์แมตข้อมูลส่งให้ช่องพิมพ์ค้นหา Position (React Select)
  const positionOptions = [
    { value: "", label: "All Positions" },
    ...positions.map((p) => ({ value: p.id, label: p.name })),
  ];

  const filteredGroups = positionGroups.filter((group) => {
    return !selectedPosition || group.positionId === selectedPosition;
  });

  const selectedPositionName =
    positions.find((p) => p.id === selectedPosition)?.name || "-";

  // ==========================
  // Badge Color (ตัวหนังสือสีดำเข้มทั้งหมด)
  // ==========================
  const getRequirementBadge = (type) => {
    switch (type) {
      case "mandatory":
        return "bg-danger text-dark fw-bold";
      case "assigned":
        return "bg-primary text-dark fw-bold";
      case "relevant":
        return "bg-warning text-dark fw-bold";
      default:
        return "bg-secondary text-dark fw-bold";
    }
  };

  // 💡 สไตล์กล่องพิมพ์ค้นหาให้เข้ากลุ่มดีไซน์สไตล์ Bootstrap
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

  return (
    <div className="container-fluid p-0">
      <h3 className="mb-4 fw-bold text-dark">Training Matrix</h3>

      {/* Filters Section */}
      <div className="card shadow-sm mb-4 border-0">
        <div className="card-body bg-white rounded">
          <div className="row g-3">
            {/* 🌟 ปรับปรุง: เปลี่ยนช่องเลือก Client เป็นกล่องอัจฉริยะ (React-Select) สามารถพิมพ์ค้นหาได้ */}
            <div className="col-md-6">
              <label className="form-label fw-semibold text-secondary">
                Client
              </label>
              <Select
                options={contractOptions}
                styles={customSelectStyles}
                value={
                  contractOptions.find(
                    (opt) => opt.value === selectedContract,
                  ) || null
                }
                onChange={(selectedOpt) => {
                  const value = selectedOpt ? selectedOpt.value : "";
                  setSelectedContract(value);
                  setSelectedPosition(""); // ล้างค่าตำแหน่งเดิมเมื่อเปลี่ยนสัญญา
                  setPositionGroups([]);
                  if (value) {
                    fetchPositions(value);
                  }
                }}
                placeholder="Type to search Client..."
                isClearable
                noOptionsMessage={() => "No clients found"}
              />
            </div>

            {/* ช่องพิมพ์ค้นหา และ เลือกตำแหน่ง */}
            <div className="col-md-6">
              <label className="form-label fw-semibold text-secondary">
                Position
              </label>
              <Select
                options={positionOptions}
                styles={customSelectStyles}
                value={
                  positionOptions.find(
                    (opt) => opt.value === selectedPosition,
                  ) || null
                }
                onChange={(selectedOpt) =>
                  setSelectedPosition(selectedOpt ? selectedOpt.value : "")
                }
                placeholder="Type to search... (e.g. Welder, Supervisor)"
                isClearable
                noOptionsMessage={() => "No positions found"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4 g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted text-uppercase fw-bold">
                Active Position
              </small>
              <div className="fs-4 fw-bold text-primary mt-1">
                {selectedPositionName}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted text-uppercase fw-bold">
                Total Trainings Required
              </small>
              <div className="fs-4 fw-bold text-success mt-1">
                {positionGroups.reduce(
                  (sum, group) => sum + group.requirements.length,
                  0,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Area */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          {/* คำอธิบายความหมาย (Legend Box) แยกสัดส่วนและแก้ไขสีแถบให้ถูกต้องตามโค้ด */}
          <div className="card bg-light border-0 mb-4 rounded-3 shadow-sm">
            <div className="card-body py-3 px-4">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <span
                  className="fw-bold text-dark me-2"
                  style={{ fontSize: "0.9rem" }}
                >
                  💡 Requirement Definitions:
                </span>
                <div
                  className="d-flex flex-wrap align-items-center gap-3"
                  style={{ fontSize: "0.85rem" }}
                >
                  <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                    <span className="badge bg-danger px-2 py-1 text-dark">
                      Mandatory = Required for all personnel
                    </span>{" "}
                    |
                  </span>{" "}
                  <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                    <span className="badge bg-primary px-2 py-1 text-dark">
                      Required = Minimum requirement by client matrix
                    </span>{" "}
                    |
                  </span>{" "}
                  <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                    <span className="badge bg-warning px-2 py-1 text-dark">
                      Assigned = Required as assigned by company
                    </span>{" "}
                    |
                  </span>{" "}
                  <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                    <span className="badge bg-warning px-2 py-1 text-dark">
                      Relevant = Applicable to related personnel
                    </span>{" "}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Loading Training Matrix...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Please select a Client and Position to view the data.
            </div>
          ) : (
            <div className="w-full">
              {filteredGroups.map((group) => (
                <div
                  key={group.positionId}
                  className="card shadow-sm mb-4 border-light"
                >
                  <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">
                      {group.positionName} :
                    </span>{" "}
                    <span className="badge bg-dark rounded-pill">
                      {group.requirements.length} Courses
                    </span>
                  </div>

                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th width="50%" className="text-dark fw-bold ps-4">
                              Training Course
                            </th>
                            <th
                              width="50%"
                              className="text-dark fw-bold text-center"
                            >
                              <div className="d-inline-flex align-items-center justify-content-center gap-2 flex-wrap">
                                <span>Requirement Type</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.requirements.map((item) => (
                            <tr key={item.id}>
                              <td
                                className="fw-medium text-dark ps-4"
                                style={{ color: "#212529" }}
                              >
                                {item.trainingName}
                              </td>
                              <td className="text-center">
                                <span
                                  className={`badge ${getRequirementBadge(item.requirementType)} px-3 py-1.5`}
                                >
                                  {item.requirementType}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
