import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function TrainingRequestHistory() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/training-requests`, { withCredentials: true })
      .then((res) => setRequests(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  const fmtDateTime = (d) =>
    new Date(d).toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filtered = requests.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.requestedByName || "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thStyle = {
    padding: "10px 16px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#6c757d",
    letterSpacing: "0.5px",
    textAlign: "left",
    background: "#fff",
    whiteSpace: "nowrap",
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

  if (loading) return <div className="p-4 text-muted">Loading...</div>;

  return (
    <div className="container-fluid p-0">
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📢</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              คำขอ Training จาก MP
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
              {filtered.length} คำขอ
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "1rem", maxWidth: "360px" }}>
          <input
            type="text"
            placeholder="ค้นหาผู้ขอ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
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
                <th style={thStyle}>Requested By</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Employees</th>
                <th style={thStyle}>Trainings</th>
                <th style={thStyle}>Client</th>
                <th style={{ ...thStyle, textAlign: "center", width: "90px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#6c757d",
                    }}
                  >
                    {search
                      ? `ไม่พบคำขอจาก "${search}"`
                      : "ยังไม่มีคำขอ training"}
                  </td>
                </tr>
              ) : (
                paged.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom:
                        idx < paged.length - 1 ? "1px solid #f1f3f5" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/training-requests/${r.id}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8f9fa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {r.requestedByName || "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "#6c757d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDateTime(r.createdAt)}
                    </td>
                    <td style={tdStyle}>👤 {r.employeeCount} คน</td>

                    {/* ← ใหม่: badge รายชื่อ training แทนแค่ตัวเลข */}
                    <td style={{ ...tdStyle, maxWidth: "260px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                        }}
                        title={r.trainingNames.join(", ")}
                      >
                        {r.trainingNames.slice(0, 2).map((name, i) => (
                          <span
                            key={i}
                            style={{
                              background: "#e9ecef",
                              color: "#495057",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              fontSize: "11px",
                            }}
                          >
                            {name}
                          </span>
                        ))}
                        {r.trainingNames.length > 2 && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#6c757d",
                              cursor: "help",
                            }}
                            title={r.trainingNames.slice(2).join(", ")}
                          >
                            +{r.trainingNames.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ← ใหม่: client */}
                    <td style={{ ...tdStyle, color: "#6c757d" }}>
                      {r.clientNames.length > 0
                        ? r.clientNames.join(", ")
                        : "—"}
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{ color: "#0d6efd", fontWeight: 600 }}>
                        ดู →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
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
                หน้า {page} / {totalPages} — ทั้งหมด {filtered.length} รายการ
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
                {getPageNumbers(page, totalPages).map((p, idx) =>
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
