import { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";

const CARD = "rounded-[10px] border border-gray-200 bg-white";
const LABEL = "mb-1.5 block text-[13px] font-semibold text-gray-900";

// react-select ใช้ styles API ของไลบรารี (ใส่ className ตรงๆ ไม่ได้)
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

export default function TrainingMatrix() {
  const { backendUrl } = useContext(AppContent);

  const [contracts, setContracts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [positionGroups, setPositionGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // กันผลลัพธ์เก่ามาทับผลลัพธ์ใหม่ เวลาเปลี่ยนตำแหน่งเร็วๆ ติดกัน
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/training-matrix/contracts`,
        { withCredentials: true },
      );
      setContracts(res.data);

      // Auto-select client แรก (ตอนนี้มีแค่ Chevron)
      if (res.data?.length > 0) {
        const defaultContract = res.data[0];
        setSelectedContract(defaultContract.id);
        fetchPositions(defaultContract.id);
        loadRequirements(defaultContract.id, ""); // "" = All Positions
      }
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

  const loadRequirements = async (contractId, positionId) => {
    if (!contractId) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/training-matrix/requirements`,
        {
          withCredentials: true,
          params: { contractId, positionId: positionId || undefined },
        },
      );
      if (requestId === requestIdRef.current) setPositionGroups(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleContractChange = (opt) => {
    const value = opt ? opt.value : "";
    setSelectedContract(value);
    setSelectedPosition("");
    setPositionGroups([]);
    if (value) {
      fetchPositions(value);
      loadRequirements(value, "");
    } else {
      setPositions([]); // เคลียร์ตำแหน่งของ client เดิม
    }
  };

  const handlePositionChange = (opt) => {
    const value = opt ? opt.value : "";
    setSelectedPosition(value);
    if (selectedContract) loadRequirements(selectedContract, value);
  };

  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const positionOptions = [
    { value: "", label: "All Positions" },
    ...positions.map((p) => ({ value: p.id, label: p.name })),
  ];

  const filteredGroups = positionGroups.filter(
    (group) => !selectedPosition || group.positionId === selectedPosition,
  );

  const selectedContractLabel =
    contractOptions.find((o) => o.value === selectedContract)?.label || "";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* Header Card */}
      <div className={`${CARD} mb-4 px-4 py-4 sm:px-6`}>
        <div className="mb-1 flex items-start gap-2.5">
          <span className="text-lg">☑️</span>
          <span className="text-lg font-bold">
            Training Matrix — Client Requirements
          </span>
        </div>
        <div className="text-[13px] text-gray-500">
          Required certifications per position for offshore eligibility
          (Chevron)
        </div>
      </div>

      {/* Filter Card */}
      <div className={`${CARD} mb-4 px-4 py-4 sm:px-6`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <div>
            <label className={LABEL}>Select Client</label>
            <Select
              options={contractOptions}
              styles={customSelectStyles}
              value={
                contractOptions.find((o) => o.value === selectedContract) ||
                null
              }
              onChange={handleContractChange}
              placeholder="Type to search Client..."
              isClearable
              noOptionsMessage={() => "No clients found"}
            />
          </div>
          <div>
            <label className={LABEL}>Search Position</label>
            <Select
              options={positionOptions}
              styles={customSelectStyles}
              value={
                positionOptions.find((o) => o.value === selectedPosition) ||
                null
              }
              onChange={handlePositionChange}
              placeholder="🔍 e.g. Welder, Rigger, Scaffolder..."
              isClearable
              isDisabled={!selectedContract}
              noOptionsMessage={() => "No positions found"}
            />
          </div>
        </div>
      </div>

      {/* Output Area */}
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500 sm:p-[60px]">
          Loading Training Matrix...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500 sm:p-[60px]">
          {selectedContract
            ? "No training requirements found for this selection."
            : "Please select a Client to view the data."}
        </div>
      ) : (
        filteredGroups.map((group) => (
          <div
            key={group.positionId}
            className={`${CARD} mb-4 overflow-hidden`}
          >
            {/* Group Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3.5 sm:px-6">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <span className="break-words text-base font-bold">
                  {group.positionName}
                </span>
                {selectedContractLabel && (
                  <span className="rounded-md bg-[#e7f1ff] px-2.5 py-[3px] text-xs font-semibold text-blue-600">
                    {selectedContractLabel}
                  </span>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-[#fff3cd] px-3 py-[3px] text-xs font-semibold text-[#664d03]">
                {group.requirements.length} required
              </span>
            </div>

            {/* Requirements — มือถือ 1 คอลัมน์, md+ 2 คอลัมน์ */}
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                {group.requirements.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 border-b border-gray-100 px-1 py-2 text-[13px]"
                  >
                    <span className="min-w-[24px] font-semibold text-gray-500">
                      {i + 1}.
                    </span>
                    <span className="min-w-0 break-words text-gray-900">
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
  );
}
