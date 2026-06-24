import { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { AppContent } from "../../context/AppContext";

// ── palette ──
const NAVY = "#1e3a5f";
const ORANGE = "#e8833a";
const CERT = { valid: "#198754", expiring: "#f5c518", expired: "#dc3545" };

// ════════════════════════════════════════════════════════════════
// CSV export (summary + breakdown, ไฟล์เดียว)
// ════════════════════════════════════════════════════════════════
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function buildCSV(d) {
  const rows = [["Section", "Item", "Value"]];
  rows.push(["Summary", "Total Workers", d.totalWorkers]);
  rows.push(["Summary", "Total Projects", d.projects.total]);
  rows.push(["Summary", "Active Projects", d.projects.active]);
  rows.push(["Summary", "Completed Projects", d.projects.completed]);
  d.headcountByDivision.forEach((x) =>
    rows.push(["Headcount by Department", x.name, x.count]),
  );
  d.topPositions.forEach((x) => rows.push(["Top Positions", x.name, x.count]));
  Object.entries(d.workerMobilization).forEach(([k, v]) =>
    rows.push(["Mobilization Status", k, v]),
  );
  Object.entries(d.workerAvailability).forEach(([k, v]) =>
    rows.push(["Availability", k, v]),
  );
  rows.push(["Certification", "Valid", d.certCompliance.valid]);
  rows.push(["Certification", "Expiring <=60d", d.certCompliance.expiring]);
  rows.push(["Certification", "Expired", d.certCompliance.expired]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

// ── card wrapper ──
function Card({ title, children }) {
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
        }}
      >
        {title}
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, strong, divider }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: "1px solid #f1f3f5",
        borderTop: divider ? "2px solid #e9ecef" : "none",
        fontSize: "13px",
      }}
    >
      <span style={{ fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// tooltip กล่องเดียวใช้ร่วม
const tooltipStyle = {
  background: "#fff",
  border: "1px solid #dee2e6",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "6px 10px",
};

export default function AnalyticsReports() {
  const { backendUrl } = useContext(AppContent);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${backendUrl}/api/analytics`, { withCredentials: true })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  const exportCSV = () => {
    if (!data) return;
    const blob = new Blob([buildCSV(data)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // map สำหรับ recharts
  const deptData = data.headcountByDivision.map((d) => ({
    name: d.name,
    Workers: d.count,
  }));
  const posData = data.topPositions.map((d) => ({
    name: d.name,
    Workers: d.count,
  }));
  const certData = [
    { name: "Valid", value: data.certCompliance.valid, color: CERT.valid },
    {
      name: "Expiring ≤60d",
      value: data.certCompliance.expiring,
      color: CERT.expiring,
    },
    {
      name: "Expired",
      value: data.certCompliance.expired,
      color: CERT.expired,
    },
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
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>
            📊 Analytics &amp; Reports
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#6c757d" }}>
            Workforce Intelligence Dashboard
          </div>
        </div>
        <button
          onClick={exportCSV}
          style={{
            background: "#198754",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⬇ Export CSV Report
        </button>
      </div>

      {/* row 1: department + positions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <Card title="Headcount by Department">
          {deptData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={deptData}
                margin={{ top: 16, right: 8, left: -16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6c757d" }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#adb5bd" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#f1f3f5" }}
                />
                <Bar dataKey="Workers" fill={NAVY} radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="Workers"
                    position="top"
                    fontSize={11}
                    fill={NAVY}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#6c757d", fontSize: "13px" }}>No data</div>
          )}
        </Card>

        <Card title="Top Positions / Trades">
          {posData.length ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, posData.length * 38)}
            >
              <BarChart
                data={posData}
                layout="vertical"
                margin={{ top: 8, right: 32, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef0f2"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#adb5bd" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "#495057" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#f1f3f5" }}
                />
                <Bar dataKey="Workers" fill={ORANGE} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="Workers"
                    position="right"
                    fontSize={11}
                    fill="#495057"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#6c757d", fontSize: "13px" }}>No data</div>
          )}
        </Card>
      </div>

      {/* row 2: summary + cert */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <Card title="Workforce Summary">
          <SummaryRow label="Total Workers" value={data.totalWorkers} strong />
          <SummaryRow label="Total Projects" value={data.projects.total} />
          <SummaryRow label="Active Projects" value={data.projects.active} />
          <SummaryRow
            label="Completed Projects"
            value={data.projects.completed}
          />
          <SummaryRow
            label="Mobilization: Pending"
            value={data.workerMobilization.pending}
            divider
          />
          <SummaryRow
            label="Mobilization: Ready"
            value={data.workerMobilization.ready}
          />
          <SummaryRow
            label="Mobilization: On-Site"
            value={data.workerMobilization.on_site}
          />
          <SummaryRow
            label="Availability: Available"
            value={data.workerAvailability.available}
            divider
          />
          <SummaryRow
            label="Availability: Unavailable"
            value={data.workerAvailability.unavailable}
          />
        </Card>

        <Card title="Certification Compliance Overview">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={certData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={1}
                stroke="none"
              >
                {certData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
