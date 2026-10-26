import { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import Select from "react-select";

const LABEL = "mb-1 block text-[11px] font-semibold text-gray-500";

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

  const totalRequired = filteredGroups.reduce(
    (sum, g) => sum + g.requirements.length,
    0,
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px]">
      {/* ════════ Header ════════ */}
      <div className="pb-3 text-xs text-gray-500">
        Client Requirements — required certifications per position for
        offshore eligibility (Chevron)
      </div>

      {/* ════════ Filter — แถวเดียว คั่นด้วยเส้น ════════ */}
      <div className="grid grid-cols-1 gap-3 border-y border-gray-200 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-end">
        <div className="min-w-0">
          <label className={LABEL}>Client</label>
          <Select
            options={contractOptions}
            styles={customSelectStyles}
            value={
              contractOptions.find((o) => o.value === selectedContract) || null
            }
            onChange={handleContractChange}
            placeholder="Type to search Client..."
            isClearable
            noOptionsMessage={() => "No clients found"}
          />
        </div>
        <div className="min-w-0">
          <label className={LABEL}>Position</label>
          <Select
            options={positionOptions}
            styles={customSelectStyles}
            value={
              positionOptions.find((o) => o.value === selectedPosition) || null
            }
            onChange={handlePositionChange}
            placeholder="🔍 e.g. Welder, Rigger, Scaffolder..."
            isClearable
            isDisabled={!selectedContract}
            noOptionsMessage={() => "No positions found"}
          />
        </div>
        {!loading && filteredGroups.length > 0 && (
          <div className="whitespace-nowrap pb-2 text-xs text-gray-500">
            <b className="text-gray-900">{filteredGroups.length}</b> ตำแหน่ง ·{" "}
            <b className="text-gray-900">{totalRequired}</b> requirements
          </div>
        )}
      </div>

      {/* ════════ Output ════════ */}
      {loading ? (
        <div className="border-b border-gray-200 p-10 text-center text-sm text-gray-500 sm:p-[60px]">
          Loading Training Matrix...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="border-b border-gray-200 p-10 text-center text-sm text-gray-500 sm:p-[60px]">
          {selectedContract
            ? "No training requirements found for this selection."
            : "Please select a Client to view the data."}
        </div>
      ) : (
        filteredGroups.map((group) => (
          <section
            key={group.positionId}
            className="border-b border-gray-200 py-4"
          >
            {/* Group Header */}
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-[15px] font-bold">
                {group.positionName}
              </span>
              <span className="shrink-0 rounded-md bg-[#fff3cd] px-2.5 py-0.5 text-xs font-semibold text-[#664d03]">
                {group.requirements.length} required
              </span>
            </div>

            {/* Requirements — มือถือ 1 คอลัมน์, md 2, xl 3 */}
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              {group.requirements.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 border-b border-gray-100 py-1.5 text-[13px]"
                >
                  <span className="min-w-[24px] text-gray-400">{i + 1}.</span>
                  <span className="min-w-0 break-words text-gray-900">
                    {item.trainingName}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
