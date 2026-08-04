import { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";
import { useSearchParams } from "react-router-dom";

export default function Certifications() {
  const { backendUrl, userData } = useContext(AppContent);

  const canRequestTraining = ["admin", "manpower"].includes(
    userData?.role?.name,
  );

  const [trainingOptions, setTrainingOptions] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ── เลือก worker เพื่อขอ training ──
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [requesting, setRequesting] = useState(false);

  // ในฟังก์ชัน component
  const [searchParams] = useSearchParams();

  // เพิ่ม state ใหม่
  const [highlightedIds, setHighlightedIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/global-trainings`, {
          withCredentials: true,
        });
        setTrainingOptions(
          (res.data || []).map((t) => ({
            value: t.id,
            label: `${t.name} (${t._count?.employeeTrainings ?? 0})`,
          })),
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, [backendUrl]);

  const loadCertification = useCallback(
    async (trainingId) => {
      if (!trainingId) return;
      try {
        setLoading(true);
        const res = await axios.get(
          `${backendUrl}/api/compliance/certification/${trainingId}`,
          { withCredentials: true },
        );
        setData(res.data);
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl],
  );

  useEffect(() => {
    if (selectedTraining) loadCertification(selectedTraining.value);
    else setData(null);
    setSelectedEmployeeIds([]); // reset selection ทุกครั้งที่เปลี่ยน training
  }, [selectedTraining, loadCertification]);

  // แก้ useEffect เดิมที่อ่าน trainingId ให้อ่าน empIds ด้วย
  useEffect(() => {
    const trainingId = searchParams.get("trainingId");
    const empIds = searchParams.get("empIds");
    if (trainingId && trainingOptions.length > 0 && !selectedTraining) {
      const match = trainingOptions.find((o) => o.value === trainingId);
      if (match) setSelectedTraining(match);
    }
    if (empIds) {
      setHighlightedIds(empIds.split(","));
    }
  }, [trainingOptions, searchParams]);

  const badge = (bg, color, text) => (
    <span
      style={{
        background: bg,
        color,
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );

  const filteredWorkers = (data?.workers || []).filter((w) => {
    const matchSearch =
      w.empCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" ? true : w.bucket === statusFilter;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    if (highlightedIds.length > 0 && filteredWorkers.length > 0) {
      const el = document.getElementById(`worker-row-${highlightedIds[0]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedIds, filteredWorkers]);

  const bucketBadge = (bucket) => {
    switch (bucket) {
      case "expired":
        return badge("#f8d7da", "#842029", "🔴 Expired");
      case "critical":
        return badge("#f8d7da", "#842029", "🔥 Critical");
      case "warning":
        return badge("#fff3cd", "#664d03", "🟡 Warning");
      case "valid":
        return badge("#d1e7dd", "#0f5132", "✅ Valid");
      case "missing":
        return badge("#e9ecef", "#495057", "— Missing");
      default:
        return "—";
    }
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const allFilteredSelected =
    filteredWorkers.length > 0 &&
    filteredWorkers.every((w) => selectedEmployeeIds.includes(w.employeeId));

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const ids = new Set(filteredWorkers.map((w) => w.employeeId));
      setSelectedEmployeeIds((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedEmployeeIds((prev) => [
        ...new Set([...prev, ...filteredWorkers.map((w) => w.employeeId)]),
      ]);
    }
  };

  const handleRequestTraining = async () => {
    if (!selectedTraining || selectedEmployeeIds.length === 0) return;
    try {
      setRequesting(true);
      await axios.post(
        `${backendUrl}/api/compliance/request-training`,
        {
          trainingId: selectedTraining.value,
          employeeIds: selectedEmployeeIds,
        },
        { withCredentials: true },
      );
      alert(
        `แจ้ง HR ให้จัด training "${selectedTraining.label.replace(/\s*\(\d+\)$/, "")}" ให้ ${selectedEmployeeIds.length} คนแล้ว`,
      );
      setSelectedEmployeeIds([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "แจ้งไม่สำเร็จ — ดู console");
    } finally {
      setRequesting(false);
    }
  };

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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📋</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Certifications
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d", marginTop: "4px" }}>
            เลือก training เพื่อดูสถานะของ worker แต่ละคนสำหรับ cert นั้น
          </div>
        </div>

        {/* Filter card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{ minWidth: "220px", flex: "1 1 220px", maxWidth: "320px" }}
          >
            <Select
              options={trainingOptions}
              value={selectedTraining}
              onChange={setSelectedTraining}
              placeholder="เลือก training / certification..."
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "36px",
                  fontSize: "13px",
                  borderColor: "#dee2e6",
                }),
                option: (base) => ({ ...base, fontSize: "13px" }),
                singleValue: (base) => ({ ...base, fontSize: "13px" }),
                placeholder: (base) => ({ ...base, fontSize: "13px" }),
              }}
            />
          </div>

          {selectedTraining && (
            <>
              <div
                style={{
                  position: "relative",
                  flex: "1 1 220px",
                  maxWidth: "380px",
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
                  placeholder="Search name, ID, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "210px",
                  padding: "7px 12px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#fff",
                }}
              >
                <option value="all">All Status</option>
                <option value="expired">🔴 Expired</option>
                <option value="critical">🔥 Critical (&lt;30 days)</option>
                <option value="warning">🟡 Warning (30-60 days)</option>
                <option value="valid">✅ Valid</option>
                <option value="missing">⚪ Missing</option>
              </select>
              {(statusFilter !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: "13px",
                    border: "1px solid #dc3545",
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
            </>
          )}
        </div>

        {!selectedTraining ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "60px",
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            เลือก training ด้านบนเพื่อดูรายการ
          </div>
        ) : loading ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "60px",
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            Loading...
          </div>
        ) : data ? (
          <>
            {/* Stats cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                {
                  icon: "🔴",
                  value: data.stats.expired,
                  label: "Expired",
                  key: "expired",
                  color: "#dc3545",
                },
                {
                  icon: "🔥",
                  value: data.stats.critical,
                  label: "Critical (<30 days)",
                  key: "critical",
                  color: "#cc8400",
                },
                {
                  icon: "🟡",
                  value: data.stats.warning,
                  label: "Warning (30-60 days)",
                  key: "warning",
                  color: "#0aa2c0",
                },
                {
                  icon: "✅",
                  value: data.stats.valid,
                  label: "Valid",
                  key: "valid",
                  color: "#198754",
                },
                {
                  icon: "⚪",
                  value: data.stats.missing,
                  label: "Missing (ยังไม่มี cert)",
                  key: "missing",
                  color: "#6c757d",
                },
              ].map((c) => (
                <div
                  key={c.key}
                  onClick={() =>
                    setStatusFilter(statusFilter === c.key ? "all" : c.key)
                  }
                  style={{
                    background: "#fff",
                    border:
                      statusFilter === c.key
                        ? `2px solid ${c.color}`
                        : "1px solid #dee2e6",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: c.color,
                    }}
                  >
                    {c.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    {c.icon} {c.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Request Training bar — โผล่เมื่อเลือกคนไว้ */}
            {canRequestTraining && selectedEmployeeIds.length > 0 && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffe69c",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#664d03" }}>
                  เลือกไว้ <strong>{selectedEmployeeIds.length}</strong> คน
                  สำหรับ training นี้
                </span>
                <button
                  onClick={handleRequestTraining}
                  disabled={requesting}
                  style={{
                    background: "#664d03",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: requesting ? "not-allowed" : "pointer",
                  }}
                >
                  {requesting ? "กำลังส่ง..." : "📢 แจ้ง HR ให้จัด Training"}
                </button>
              </div>
            )}

            {highlightedIds.length > 0 && (
              <div
                style={{
                  background: "#e9f5fb",
                  border: "1px solid #b6e0f5",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  marginBottom: "1rem",
                  fontSize: "13px",
                  color: "#0a5a8a",
                }}
              >
                📌 มาจากคำขอ Training ล่าสุด —
                เน้นแถวสีเหลืองด้านล่างคือคนที่ถูกระบุใน request นี้ (
                {highlightedIds.length} คน)
              </div>
            )}

            {/* Worker list */}
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
                    {canRequestTraining && (
                      <th style={{ padding: "10px 14px", width: "36px" }}>
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleAllFiltered}
                          style={{
                            width: "15px",
                            height: "15px",
                            cursor: "pointer",
                          }}
                        />
                      </th>
                    )}
                    {[
                      "WORKER",
                      "POSITION",
                      "STATUS",
                      "ISSUED DATE",
                      "EXPIRY DATE",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6c757d",
                          textAlign: "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((w) => {
                    const checked = selectedEmployeeIds.includes(w.employeeId);
                    return (
                      <tr
                        key={w.employeeId}
                        id={`worker-row-${w.employeeId}`}
                        style={{
                          borderBottom: "1px solid #f1f3f5",
                          background: highlightedIds.includes(w.employeeId)
                            ? "#fff3cd" // ← highlight คนที่ถูกขอ
                            : checked
                              ? "#fffbe6"
                              : "#fff",
                        }}
                      >
                        {canRequestTraining && (
                          <td style={{ padding: "12px 14px" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEmployee(w.employeeId)}
                              style={{
                                width: "15px",
                                height: "15px",
                                cursor: "pointer",
                              }}
                            />
                          </td>
                        )}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{w.fullName}</div>
                          <div style={{ fontSize: "11px", color: "#6c757d" }}>
                            {w.empCode}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#6c757d" }}>
                          <div>{w.position || "—"}</div>
                          {w.department && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#adb5bd",
                                marginTop: "2px",
                              }}
                            >
                              {w.department}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {bucketBadge(w.bucket)}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#6c757d" }}>
                          {!w.hasRecord ? (
                            <span style={{ color: "#adb5bd" }}>N/A</span>
                          ) : w.completedDate ? (
                            new Date(w.completedDate).toLocaleDateString()
                          ) : (
                            <span style={{ color: "#adb5bd" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#6c757d" }}>
                          {!w.hasRecord ? (
                            <span style={{ color: "#adb5bd" }}>N/A</span>
                          ) : w.expiryDate ? (
                            new Date(w.expiryDate).toLocaleDateString()
                          ) : (
                            <span style={{ color: "#198754", fontWeight: 500 }}>
                              ไม่มีวันหมดอายุ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
