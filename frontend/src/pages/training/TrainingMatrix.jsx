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

  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const positionOptions = [
    { value: "", label: "All Positions" },
    ...positions.map((p) => ({ value: p.id, label: p.name })),
  ];

  const filteredGroups = positionGroups.filter((group) => {
    return !selectedPosition || group.positionId === selectedPosition;
  });

  const selectedPositionName =
    positions.find((p) => p.id === selectedPosition)?.name || "-";

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

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#dee2e6",
      borderRadius: "8px",
      minHeight: "38px",
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

  const selectedContractLabel =
    contractOptions.find((o) => o.value === selectedContract)?.label || "";

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "18px" }}>☑️</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Training Matrix — Client Requirements
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d" }}>
            Required certifications per position for offshore eligibility (PTTEP
            & Chevron)
          </div>
        </div>

        {/* Filter Card */}
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
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#212529",
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                Select Client
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
                  setSelectedPosition("");
                  setPositionGroups([]);
                  if (value) fetchPositions(value);
                }}
                placeholder="Type to search Client..."
                isClearable
                noOptionsMessage={() => "No clients found"}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#212529",
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                Search Position
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
                placeholder="🔍 e.g. Welder, Rigger, Scaffolder..."
                isClearable
                noOptionsMessage={() => "No positions found"}
              />
            </div>
          </div>
        </div>

        {/* Output Area */}
        {loading ? (
          <div
            style={{ textAlign: "center", padding: "60px", color: "#6c757d" }}
          >
            Loading Training Matrix...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "#6c757d",
              fontSize: "14px",
            }}
          >
            Please select a Client and Position to view the data.
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.positionId}
              style={{
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                overflow: "hidden",
              }}
            >
              {/* Group Header */}
              <div
                style={{
                  padding: "14px 24px",
                  borderBottom: "1px solid #dee2e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontWeight: 700, fontSize: "16px" }}>
                    {group.positionName}
                  </span>
                  {selectedContractLabel && (
                    <span
                      style={{
                        background: "#055160",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "3px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {selectedContractLabel}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    background: "#212529",
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "3px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {group.requirements.length} required
                </span>
              </div>

              {/* Requirements List — 2 columns */}
              <div style={{ padding: "16px 24px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2px",
                  }}
                >
                  {group.requirements.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "8px 4px",
                        borderBottom: "1px solid #f1f3f5",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#6c757d",
                          fontWeight: 600,
                          minWidth: "24px",
                        }}
                      >
                        {i + 1}.
                      </span>
                      <span style={{ fontSize: "13px", color: "#212529" }}>
                        {item.trainingName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
