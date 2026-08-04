import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function TrainingRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/training-requests/${id}`, {
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
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/certifications")}
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
          ← Back to Certifications
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
            📢 คำขอ Training จาก MP
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d", marginTop: "4px" }}>
            {data.requestedByName ? `ขอโดย ${data.requestedByName} · ` : ""}
            {new Date(data.createdAt).toLocaleString()}
          </div>
        </div>

        {data.groups.map((g) => (
          <div
            key={g.trainingId}
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              marginBottom: "1rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #dee2e6",
                fontWeight: 700,
                fontSize: "14px",
                background: "#f8f9fa",
              }}
            >
              🎓 {g.trainingName}{" "}
              <span style={{ color: "#6c757d", fontWeight: 400 }}>
                ({g.employees.length} คน)
              </span>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["WORKER", "POSITION", "CLIENT"].map((h) => (
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
                {g.employees.map((e, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontWeight: 600 }}>{e.fullName}</div>
                      <div style={{ fontSize: "11px", color: "#6c757d" }}>
                        {e.empCode}
                      </div>
                    </td>
                    <td style={{ padding: "10px 20px" }}>
                      {e.position || "—"}
                    </td>
                    <td style={{ padding: "10px 20px" }}>
                      {e.clientName || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
