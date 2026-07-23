import { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import Select from "react-select";
import { AppContent } from "../../context/AppContext";

export default function Certifications() {
  const { backendUrl } = useContext(AppContent);

  const [trainingOptions, setTrainingOptions] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
  }, [selectedTraining, loadCertification]);

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

  return (
    <div
      style={{ width: "100%", padding: "8px 20px", boxSizing: "border-box" }}
    >
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

      {/* ← แทรก card ใหม่ตรงนี้ */}
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
              option: (base) => ({
                ...base,
                fontSize: "13px", // ← เพิ่มใหม่ ลด font ตัวเลือกใน dropdown list
              }),
              singleValue: (base) => ({
                ...base,
                fontSize: "13px", // ← เพิ่มใหม่ ลด font ตัวที่แสดงหลังเลือกแล้ว
              }),
              placeholder: (base) => ({
                ...base,
                fontSize: "13px", // ← เพิ่มใหม่ ลด font placeholder
              }),
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
                  style={{ fontSize: "28px", fontWeight: 700, color: c.color }}
                >
                  {c.value}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>
                  {c.icon} {c.label}
                </div>
              </div>
            ))}
          </div>

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
                {filteredWorkers.map((w) => (
                  <tr
                    key={w.employeeId}
                    style={{ borderBottom: "1px solid #f1f3f5" }}
                  >
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
