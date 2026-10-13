import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function MedicalRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/medical-requests/${id}`, {
        withCredentials: true,
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, backendUrl]);

  if (loading) return <div className="p-4 text-muted">Loading...</div>;
  if (!data) return <div className="p-4 text-muted">Request not found</div>;

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "min(1800px, 95vw)", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/requests-history?type=medical")} // ← เพิ่ม ?type=medical
          style={{
            background: "none",
            border: "none",
            color: "#6c757d",
            cursor: "pointer",
            fontSize: "13px",
            padding: 0,
            marginBottom: "8px",
          }}
        >
          ← Back to Requests
        </button>

        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 700 }}>
            🏥 คำขอ Medical Check-up จาก MP
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d", marginTop: "4px" }}>
            {data.requestedByName ? `ขอโดย ${data.requestedByName} · ` : ""}
            {new Date(data.createdAt).toLocaleString()}
          </div>
        </div>

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
              <tr style={{ background: "#fafafa" }}>
                {["WORKER", "POSITION", "CLIENT", "REASON"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 20px",
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
              {data.employees.map((e, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f3f5" }}>
                  <td style={{ padding: "10px 20px" }}>
                    <div style={{ fontWeight: 600 }}>{e.fullName}</div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      {e.empCode}
                    </div>
                  </td>
                  <td style={{ padding: "10px 20px" }}>{e.position || "—"}</td>
                  <td style={{ padding: "10px 20px" }}>
                    {e.clientName || "—"}
                  </td>
                  <td style={{ padding: "10px 20px" }}>
                    {e.reason === "overdue"
                      ? "❌ หมดอายุ"
                      : e.reason === "no_record"
                        ? "⚪ ไม่มีข้อมูล"
                        : e.reason === "due_soon"
                          ? "⏰ ใกล้หมดอายุ"
                          : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
