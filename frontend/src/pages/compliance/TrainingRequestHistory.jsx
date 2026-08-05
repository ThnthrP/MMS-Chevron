import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function TrainingRequestHistory() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/training-requests`, { withCredentials: true })
      .then((res) => setRequests(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  if (loading) return <div className="p-4 text-muted">Loading...</div>;

  return (
    <div className="container-fluid p-0">
      <div style={{ width: "100%" }}>
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
            📢 คำขอ Training จาก MP — ทั้งหมด
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d", marginTop: "4px" }}>
            {requests.length} คำขอ
          </div>
        </div>

        {requests.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#6c757d",
              fontSize: "13px",
            }}
          >
            ยังไม่มีคำขอ training
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              onClick={() => navigate(`/training-requests/${r.id}`)}
              style={{
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "10px",
                padding: "14px 20px",
                marginBottom: "10px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8f9fa")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {r.requestedByName
                    ? `ขอโดย ${r.requestedByName}`
                    : "คำขอ Training"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6c757d",
                    marginTop: "2px",
                  }}
                >
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#0d6efd",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {r.employeeCount} คน · {r.trainingCount} training →
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
