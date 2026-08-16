import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import AsyncSelect from "react-select/async";

const PAGE_SIZE = 15;

const DETAIL_FIELDS = [
  ["owner", "เจ้าของงาน"],
  ["year", "Year"],
  ["projectCode", "Project On"],
  ["jobTitle", "Project / Job"],
  ["ccNo", "CC. No."],
  ["engineer", "Project Engineer"],
  ["customerName", "Customer Name"],
  ["wrPoSr", "WR / PO / SR"],
  ["woAfe", "WO / AFE"],
  ["wa", "WA"],
  ["exptEq", "Expt EQ"],
  ["termOfPaymentDays", "Term of Payment"],
  ["company", "Company"],
  ["team", "Team"],
  ["paymentTerms", "Payment Terms"],
  ["totalValue", "Total Value"],
];

export default function Project() {
  const { backendUrl, userData } = useContext(AppContent);
  const navigate = useNavigate();

  const canManageProjects = ["admin", "pe"].includes(userData?.role?.name);

  const [years, setYears] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ records: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [clients, setClients] = useState([]);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [linkedProjectsModal, setLinkedProjectsModal] = useState(null);

  // ── Start Project modal (แทนที่ Activate modal เดิม) ──
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedMasterRecord, setSelectedMasterRecord] = useState(null);
  const [startContractId, setStartContractId] = useState("");
  const [startForm, setStartForm] = useState({
    location: "",
    startDate: "",
    endDate: "",
    isOffshore: false,
    notes: "",
  });
  const [starting, setStarting] = useState(false);

  const fetchYears = async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/projects/master-records/years`,
        { withCredentials: true },
      );
      setYears(res.data);
      if (res.data.length > 0 && activeYear === null) {
        setActiveYear(res.data[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/clients`, {
        withCredentials: true,
      });
      setClients(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRecords = async (year, pageNum, search) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/projects/master-records/browse`,
        {
          withCredentials: true,
          params: { year, page: pageNum, pageSize: PAGE_SIZE, search },
        },
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeYear !== null) fetchRecords(activeYear, page, searchQuery);
  }, [activeYear, page, searchQuery]);

  const switchYear = (y) => {
    setActiveYear(y);
    setPage(1);
  };

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  // ── auto-match client จาก record.company (best-effort, ยัง override ได้) ──
  const guessContract = (record) => {
    if (!record?.company) return "";
    const q = record.company.toLowerCase();
    for (const c of clients) {
      if (
        c.name.toLowerCase().includes(q) ||
        q.includes(c.name.toLowerCase())
      ) {
        if (c.contracts?.length === 1) return c.contracts[0].id;
      }
    }
    return "";
  };

  // ── โหลด options สำหรับ AsyncSelect ค้นหา ON Number (ค้นได้ทุก record ไม่ว่าจะเคย start ไปแล้วหรือยัง) ──
  const loadMasterRecordOptions = async (inputValue) => {
    try {
      const res = await axios.get(`${backendUrl}/api/projects/master-records`, {
        withCredentials: true,
        params: { search: inputValue },
      });
      return res.data.map((r) => ({
        value: r.id,
        label: `${r.projectCode} — ${r.jobTitle}`,
        record: r,
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  // ── เปิด Start Project modal — prefillRecord ถ้ามาจากปุ่ม "Start อีกอัน" ในหน้า Linked Projects ──
  const openStartModal = (prefillRecord = null) => {
    if (prefillRecord) {
      setSelectedMasterRecord({
        value: prefillRecord.id,
        label: `${prefillRecord.projectCode} — ${prefillRecord.jobTitle}`,
        record: prefillRecord,
      });
      setStartContractId(guessContract(prefillRecord));
    } else {
      setSelectedMasterRecord(null);
      setStartContractId("");
    }
    setStartForm({
      location: "",
      startDate: "",
      endDate: "",
      isOffshore: false,
      notes: "",
    });
    setStartModalOpen(true);
  };

  const closeStartModal = () => {
    setStartModalOpen(false);
    setSelectedMasterRecord(null);
    setStartContractId("");
    setStartForm({
      location: "",
      startDate: "",
      endDate: "",
      isOffshore: false,
      notes: "",
    });
  };

  const handleStartSubmit = async () => {
    if (!selectedMasterRecord) {
      alert("กรุณาเลือก ON Number ก่อน");
      return;
    }
    if (!startContractId) {
      alert("กรุณาเลือก Client/Contract");
      return;
    }
    try {
      setStarting(true);
      const res = await axios.post(
        `${backendUrl}/api/projects`,
        {
          masterProjectRecordId: selectedMasterRecord.value,
          contractId: startContractId,
          location: startForm.location || null,
          startDate: startForm.startDate || null,
          endDate: startForm.endDate || null,
          isOffshore: startForm.isOffshore,
          notes: startForm.notes || null,
        },
        { withCredentials: true },
      );
      closeStartModal();
      navigate(`/projects/${res.data.id}`);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "เปิดใช้งาน Project ไม่สำเร็จ");
    } finally {
      setStarting(false);
    }
  };

  const formatDetailValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (key === "termOfPaymentDays") return `${value} วัน`;
    if (key === "totalValue") return Number(value).toLocaleString("th-TH");
    return value;
  };

  const thStyle = {
    padding: "10px 16px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#6c757d",
    letterSpacing: "0.5px",
    textAlign: "left",
    background: "#fff",
  };
  const tdStyle = { padding: "12px 16px", fontSize: "13px" };
  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#212529",
  };
  const labelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    display: "block",
  };
  const btnBase = {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    minWidth: "72px",
  };

  const getPageNumbers = (current, total) => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let last;
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }
    range.forEach((i) => {
      if (last) {
        if (i - last === 2) rangeWithDots.push(last + 1);
        else if (i - last > 2) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      last = i;
    });
    return rangeWithDots;
  };

  // ── grid label-value สำหรับสรุป record ที่เลือก (ใช้ทั้งใน Start modal และ View modal) ──
  const RecordSummaryGrid = ({ record }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        rowGap: "4px",
        fontSize: "12px",
      }}
    >
      <div style={{ fontWeight: 600, color: "#6c757d" }}>ON Number</div>
      <div>{record.projectCode}</div>
      <div style={{ fontWeight: 600, color: "#6c757d" }}>Project / Job</div>
      <div>{record.jobTitle}</div>
      <div style={{ fontWeight: 600, color: "#6c757d" }}>Customer</div>
      <div>{record.customerName || "—"}</div>
      <div style={{ fontWeight: 600, color: "#6c757d" }}>Company</div>
      <div>{record.company || "—"}</div>
    </div>
  );

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
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
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🗂</span>
              <span style={{ fontSize: "18px", fontWeight: 700 }}>
                Projects
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
                Phase 3
              </span>
              <span style={{ color: "#6c757d", fontSize: "12px" }}>
                Master Project Register — เลือก ON Number เพื่อเปิด/ดู Project
              </span>
            </div>

            {canManageProjects && (
              <button
                onClick={() => openStartModal(null)}
                style={{
                  ...btnBase,
                  background: "#198754",
                  color: "#fff",
                  border: "none",
                  padding: "9px 18px",
                  fontSize: "13px",
                }}
              >
                🚀 Start New Project
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="ค้นหา ON Number / ชื่องาน / ลูกค้า / Engineer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={runSearch}
            style={{
              ...btnBase,
              background: "#0d6efd",
              color: "#fff",
              border: "none",
              padding: "8px 20px",
            }}
          >
            🔍 ค้นหา
          </button>
          {searchQuery && (
            <button
              onClick={clearSearch}
              style={{
                ...btnBase,
                background: "#fff",
                color: "#6c757d",
                border: "1px solid #dee2e6",
                padding: "8px 16px",
              }}
            >
              ✕ ล้าง
            </button>
          )}
        </div>

        {searchQuery && (
          <div
            style={{ fontSize: "12px", color: "#6c757d", marginBottom: "12px" }}
          >
            ผลค้นหา "{searchQuery}" ในปี {activeYear} — พบ {data.total} รายการ
          </div>
        )}

        {/* Year Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "1rem",
            borderBottom: "1px solid #dee2e6",
            flexWrap: "wrap",
          }}
        >
          {years.map((y) => (
            <button
              key={y}
              onClick={() => switchYear(y)}
              style={{
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: activeYear === y ? 700 : 500,
                border: "none",
                borderBottom:
                  activeYear === y
                    ? "2px solid #0d6efd"
                    : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                color: activeYear === y ? "#0d6efd" : "#6c757d",
              }}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Table Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                {[
                  ["ON NUMBER", ""],
                  ["PROJECT / JOB", ""],
                  ["CUSTOMER", ""],
                  ["COMPANY", ""],
                  ["TEAM", ""],
                  ["STATUS", ""],
                  ["ACTIONS", "170px"],
                ].map(([h, w], i) => (
                  <th
                    key={h}
                    style={{
                      ...thStyle,
                      textAlign: i === 6 ? "center" : "left",
                      width: w || undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : data.records.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                data.records.map((r, idx) => {
                  const linkedCount = r.linkedProjects?.length ?? 0;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom:
                          idx < data.records.length - 1
                            ? "1px solid #f1f3f5"
                            : "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {r.projectCode}
                      </td>
                      <td style={tdStyle}>{r.jobTitle}</td>
                      <td style={tdStyle}>{r.customerName || "—"}</td>
                      <td style={tdStyle}>{r.company || "—"}</td>
                      <td style={tdStyle}>{r.team || "—"}</td>
                      <td style={tdStyle}>
                        {linkedCount > 0 ? (
                          <span
                            style={{
                              background: "#d1e7dd",
                              color: "#0f5132",
                              borderRadius: "6px",
                              padding: "3px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✓ เปิดใช้งานแล้ว ({linkedCount})
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#fff3cd",
                              color: "#664d03",
                              borderRadius: "6px",
                              padding: "3px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ยังไม่เปิดใช้งาน
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <button
                            title="ดูรายละเอียดทั้งหมด"
                            onClick={() => setViewingRecord(r)}
                            style={{
                              ...btnBase,
                              background: "#fff",
                              color: "#495057",
                              border: "1px solid #dee2e6",
                            }}
                          >
                            👁 View
                          </button>

                          {linkedCount > 0 && (
                            <button
                              onClick={() => setLinkedProjectsModal(r)}
                              style={{
                                ...btnBase,
                                background: "#0d6efd",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              📂 รายการ ({linkedCount})
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderTop: "1px solid #dee2e6",
                fontSize: "12px",
                color: "#6c757d",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <span>
                หน้า {data.page} / {data.totalPages} — ทั้งหมด {data.total}{" "}
                รายการ
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  ← ก่อนหน้า
                </button>

                {getPageNumbers(page, data.totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      style={{ padding: "0 4px", color: "#adb5bd" }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: p === page ? 700 : 500,
                        border: `1px solid ${p === page ? "#0d6efd" : "#dee2e6"}`,
                        borderRadius: "6px",
                        background: p === page ? "#0d6efd" : "#fff",
                        color: p === page ? "#fff" : "#495057",
                        cursor: "pointer",
                        minWidth: "30px",
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page >= data.totalPages}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: page >= data.totalPages ? "not-allowed" : "pointer",
                    opacity: page >= data.totalPages ? 0.5 : 1,
                  }}
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ View Details Modal ════════ */}
      {viewingRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setViewingRecord(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "640px",
              maxHeight: "85vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>
                  {viewingRecord.projectCode}
                </div>
                <div
                  style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}
                >
                  {viewingRecord.jobTitle}
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <tbody>
                  {DETAIL_FIELDS.map(([key, label]) => (
                    <tr key={key} style={{ borderBottom: "1px solid #f1f3f5" }}>
                      <td
                        style={{
                          padding: "8px 12px 8px 0",
                          fontWeight: 600,
                          color: "#6c757d",
                          width: "160px",
                          verticalAlign: "top",
                        }}
                      >
                        {label}
                      </td>
                      <td style={{ padding: "8px 0", color: "#212529" }}>
                        {formatDetailValue(key, viewingRecord[key])}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      style={{
                        padding: "8px 12px 8px 0",
                        fontWeight: 600,
                        color: "#6c757d",
                      }}
                    >
                      สถานะ
                    </td>
                    <td style={{ padding: "8px 0" }}>
                      {(viewingRecord.linkedProjects?.length ?? 0) > 0 ? (
                        <span
                          style={{
                            background: "#d1e7dd",
                            color: "#0f5132",
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          ✓ เปิดใช้งานแล้ว (
                          {viewingRecord.linkedProjects.length} Project)
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fff3cd",
                            color: "#664d03",
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          ยังไม่เปิดใช้งาน
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                onClick={() => setViewingRecord(null)}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ปิด
              </button>
              {(viewingRecord.linkedProjects?.length ?? 0) > 0 && (
                <button
                  onClick={() => {
                    setViewingRecord(null);
                    setLinkedProjectsModal(viewingRecord);
                  }}
                  style={{
                    padding: "8px 20px",
                    fontSize: "13px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#0d6efd",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ดูรายการ Project →
                </button>
              )}
              {canManageProjects && (
                <button
                  onClick={() => {
                    setViewingRecord(null);
                    openStartModal(viewingRecord);
                  }}
                  style={{
                    padding: "8px 20px",
                    fontSize: "13px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#198754",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🚀 เปิดใช้งาน Project →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ Linked Projects Modal ════════ */}
      {linkedProjectsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setLinkedProjectsModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "480px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "16px" }}>
                📂 Projects จาก {linkedProjectsModal.projectCode}
              </span>
              <button
                onClick={() => setLinkedProjectsModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6c757d",
                  marginBottom: "12px",
                }}
              >
                {linkedProjectsModal.jobTitle}
              </div>

              {linkedProjectsModal.linkedProjects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      สร้างเมื่อ{" "}
                      {new Date(p.createdAt).toLocaleDateString("th-TH")}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "6px",
                      background: "#0d6efd",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Manage →
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {canManageProjects && (
                <button
                  onClick={() => {
                    const record = linkedProjectsModal;
                    setLinkedProjectsModal(null);
                    openStartModal(record);
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #198754",
                    borderRadius: "8px",
                    background: "#fff",
                    color: "#198754",
                    cursor: "pointer",
                  }}
                >
                  + Start อีกอันจาก ON นี้
                </button>
              )}
              <button
                onClick={() => setLinkedProjectsModal(null)}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Start New Project Modal ════════ */}
      {startModalOpen && canManageProjects && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={closeStartModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "600px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#1e3a5f",
                color: "#fff",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "16px" }}>
                🚀 Start New Project
              </span>
              <button
                onClick={closeStartModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <label style={labelStyle}>
                ON Number (Master Project Register) *
              </label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadMasterRecordOptions}
                value={selectedMasterRecord}
                onChange={(option) => {
                  setSelectedMasterRecord(option);
                  setStartContractId(
                    option?.record ? guessContract(option.record) : "",
                  );
                }}
                placeholder="ค้นหา ON Number หรือชื่องาน..."
                isClearable
                noOptionsMessage={({ inputValue }) =>
                  inputValue
                    ? "ไม่พบ ON Number ที่ตรงกัน"
                    : "พิมพ์เพื่อค้นหา ON Number..."
                }
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#dee2e6",
                    borderRadius: "8px",
                    minHeight: "38px",
                    fontSize: "13px",
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 1000001 }),
                }}
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : null
                }
              />

              {selectedMasterRecord && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "10px 12px",
                    background: "#f0f7ff",
                    border: "1px solid #cfe2ff",
                    borderRadius: "8px",
                  }}
                >
                  <RecordSummaryGrid record={selectedMasterRecord.record} />
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Client / Contract *</label>
                <select
                  value={startContractId}
                  onChange={(e) => setStartContractId(e.target.value)}
                  style={{ ...inputStyle, background: "#fff" }}
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
                <div
                  style={{
                    fontSize: "11px",
                    color: "#adb5bd",
                    marginTop: "6px",
                  }}
                >
                  Project Name จะใช้ชื่อจาก "Project / Job" ของ Master Register
                  อัตโนมัติ
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginTop: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Location / Site</label>
                  <input
                    type="text"
                    placeholder="e.g., Offshore Platform A"
                    value={startForm.location}
                    onChange={(e) =>
                      setStartForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Onshore / Offshore</label>
                  <select
                    value={startForm.isOffshore ? "offshore" : "onshore"}
                    onChange={(e) =>
                      setStartForm((prev) => ({
                        ...prev,
                        isOffshore: e.target.value === "offshore",
                      }))
                    }
                    style={{ ...inputStyle, background: "#fff" }}
                  >
                    <option value="onshore">Onshore</option>
                    <option value="offshore">Offshore (นอกชายฝั่ง)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={startForm.startDate}
                    onChange={(e) =>
                      setStartForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={startForm.endDate}
                    onChange={(e) =>
                      setStartForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  rows={3}
                  value={startForm.notes}
                  onChange={(e) =>
                    setStartForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

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
                onClick={closeStartModal}
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
                onClick={handleStartSubmit}
                disabled={!selectedMasterRecord || !startContractId || starting}
                style={{
                  padding: "8px 20px",
                  fontSize: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    !selectedMasterRecord || !startContractId || starting
                      ? "#adb5bd"
                      : "#0d6efd",
                  color: "#fff",
                  fontWeight: 600,
                  cursor:
                    !selectedMasterRecord || !startContractId || starting
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {starting ? "กำลังเปิดใช้งาน..." : "เปิดใช้งาน →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
