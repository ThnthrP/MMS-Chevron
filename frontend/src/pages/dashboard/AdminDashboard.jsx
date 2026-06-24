import { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AppContent } from "../../context/AppContext";

const CERT = { valid: "#198754", expiring: "#f5c518", expired: "#dc3545" };
const MOB = { pending: "#f5c518", ready: "#198754", on_site: "#0d6efd" };

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #dee2e6",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "6px 10px",
};

// ── KPI gradient card ──
function Kpi({ value, label, gradient, icon }) {
  return (
    <div
      style={{
        background: gradient,
        color: "#fff",
        borderRadius: "12px",
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
        minHeight: "92px",
      }}
    >
      <div style={{ fontSize: "30px", fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "13px", marginTop: "6px", opacity: 0.92 }}>
        {label}
      </div>
      <span
        style={{
          position: "absolute",
          right: "14px",
          top: "14px",
          fontSize: "34px",
          opacity: 0.25,
        }}
      >
        {icon}
      </span>
    </div>
  );
}

function Card({ title, right, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9ecef",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #e9ecef",
          fontWeight: 700,
          fontSize: "15px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        {right}
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/dashboard`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [backendUrl]);

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}>
        Loading…
      </div>
    );
  if (!data)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}>
        No data.
      </div>
    );

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const mobData = [
    { name: "Pending", value: data.mobilization.pending, color: MOB.pending },
    { name: "Ready", value: data.mobilization.ready, color: MOB.ready },
    { name: "On-Site", value: data.mobilization.on_site, color: MOB.on_site },
  ];

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "8px 4px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* header */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "10px",
          padding: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>
            🛠 Dashboard — Monitoring &amp; Compliance
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#6c757d" }}>
            {today}
          </div>
        </div>
        <button
          onClick={load}
          style={{
            border: "1px solid #dee2e6",
            background: "#fff",
            color: "#495057",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        <Kpi
          value={data.totalWorkers}
          label="Total Workers"
          icon="👥"
          gradient="linear-gradient(135deg,#3b6ea5,#1e3a5f)"
        />
        <Kpi
          value={data.counts.ready}
          label="Ready for Deployment"
          icon="✅"
          gradient="linear-gradient(135deg,#2fb380,#157347)"
        />
        <Kpi
          value={data.counts.onSite}
          label="Currently On-Site"
          icon="📍"
          gradient="linear-gradient(135deg,#4d8bf0,#2c5fc4)"
        />
        <Kpi
          value={data.counts.certAlerts}
          label="Cert Alerts (<60 days)"
          icon="⚠"
          gradient="linear-gradient(135deg,#f0883e,#dc5b2c)"
        />
      </div>

      {/* row: worker status donut + cert by type */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,360px) 1fr",
          gap: "16px",
        }}
      >
        <Card title="Worker Status (Mobilization)">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={mobData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={1}
                stroke="none"
              >
                {mobData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          {/* availability mini-bar */}
          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid #f1f3f5",
              paddingTop: "12px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6c757d",
                marginBottom: "8px",
              }}
            >
              AVAILABILITY
            </div>
            {[
              ["Available", data.availability.available, "#198754"],
              ["Unavailable", data.availability.unavailable, "#dc3545"],
            ].map(([label, val, color]) => {
              const total =
                data.availability.available + data.availability.unavailable ||
                1;
              const pct = Math.round((val / total) * 100);
              return (
                <div key={label} style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "3px",
                    }}
                  >
                    <span>{label}</span>
                    <strong>{val}</strong>
                  </div>
                  <div
                    style={{
                      background: "#eef0f2",
                      borderRadius: "4px",
                      height: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "6px",
                        borderRadius: "4px",
                        background: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Certification Compliance by Type">
          {data.certByType.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.certByType}
                margin={{ top: 8, right: 8, left: -16, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6c757d" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#adb5bd" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#f1f3f5" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Bar
                  dataKey="valid"
                  stackId="a"
                  name="Valid"
                  fill={CERT.valid}
                />
                <Bar
                  dataKey="expiring"
                  stackId="a"
                  name="Expiring"
                  fill={CERT.expiring}
                />
                <Bar
                  dataKey="expired"
                  stackId="a"
                  name="Expired"
                  fill={CERT.expired}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#6c757d", fontSize: "13px" }}>
              No certification data
            </div>
          )}
        </Card>
      </div>

      {/* alerts */}
      <Card
        title="🔔 Auto-Scan Alerts — Expiring Certifications"
        right={
          <span style={{ fontSize: "12px", color: "#6c757d" }}>
            {data.alerts.length} shown
          </span>
        }
      >
        {data.alerts.length === 0 ? (
          <div style={{ color: "#198754", fontSize: "13px", fontWeight: 600 }}>
            ✅ No expiring or expired certifications
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.alerts.map((a, i) => {
              const isExpired = a.bucket === "expired";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    background: isExpired ? "#fdf2f2" : "#fffaf0",
                    borderLeft: `3px solid ${isExpired ? CERT.expired : CERT.expiring}`,
                    borderRadius: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>
                      {a.fullName}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6c757d" }}>
                      {a.position ? `${a.position} — ` : ""}
                      {a.training}
                    </span>
                    <span
                      style={{
                        background: isExpired ? CERT.expired : CERT.expiring,
                        color: isExpired ? "#fff" : "#664d03",
                        borderRadius: "4px",
                        padding: "1px 8px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {isExpired ? "Expired" : "Expiring"}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#6c757d" }}>
                    Expires:{" "}
                    {a.expiryDate
                      ? new Date(a.expiryDate).toISOString().slice(0, 10)
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
