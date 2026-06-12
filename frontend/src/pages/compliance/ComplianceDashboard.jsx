import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

export default function ComplianceDashboard() {
  const ClientCell = ({
    completed = null,
    required = 0,
    missing = 0,
    score = 0,
  }) => {
    if (completed === null) return <span className="text-muted">—</span>;
    const color = missing === 0 ? "#198754" : "#dc3545";
    return (
      <div>
        <div className="fw-semibold" style={{ fontSize: "13px", color }}>
          {missing === 0 ? "Complete" : `${missing} Missing`}
        </div>
        <div className="text-muted" style={{ fontSize: "11px" }}>
          {completed} / {required} completed
        </div>
        <div
          style={{
            fontSize: "11px",
            color:
              score >= 80 ? "#198754" : score >= 60 ? "#ffc107" : "#dc3545",
            fontWeight: 600,
          }}
        >
          {score}% Match
        </div>
      </div>
    );
  };

  const [workers, setWorkers] = useState([]);
  const [selectedGap, setSelectedGap] = useState(null);
  const [showGapModal, setShowGapModal] = useState(false);
  const { backendUrl } = useContext(AppContent);
  const [stats, setStats] = useState({
    expired: 0,
    critical: 0,
    warning: 0,
    valid: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ล็อก scroll เมื่อ modal เปิด
  useEffect(() => {
    if (showGapModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showGapModal]);

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/compliance/dashboard`, {
          withCredentials: true,
        }),
        axios.get(`${backendUrl}/api/compliance/stats`, {
          withCredentials: true,
        }),
      ]);
      setWorkers(dashboardRes.data);
      const sorted = [...dashboardRes.data].sort((a, b) => {
        const severity = (w) =>
          (w.alerts?.expired ?? 0) > 0
            ? 3
            : (w.alerts?.critical ?? 0) > 0
              ? 2
              : (w.alerts?.warning ?? 0) > 0
                ? 1
                : 0;
        return severity(b) - severity(a);
      });
      setWorkers(sorted);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleViewGap = async (workerId) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/compliance/worker/${workerId}/gaps`,
        { withCredentials: true },
      );
      setSelectedGap(res.data);
      setShowGapModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const closeModal = () => {
    setShowGapModal(false);
    setSelectedGap(null);
  };

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const handleViewAlerts = async (workerId) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/compliance/worker/${workerId}/alerts`,
        { withCredentials: true },
      );
      setSelectedAlert(res.data);
      setShowAlertModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const closeAlertModal = () => {
    setShowAlertModal(false);
    setSelectedAlert(null);
  };

  const filteredWorkers = workers.filter((w) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      w.fullName?.toLowerCase().includes(search) ||
      w.position?.name?.toLowerCase().includes(search);

    const expired = w.alerts?.expired ?? 0;
    const critical = w.alerts?.critical ?? 0;
    const warning = w.alerts?.warning ?? 0;

    const matchStatus =
      statusFilter === "expired"
        ? expired > 0
        : statusFilter === "critical"
          ? expired === 0 && critical > 0
          : statusFilter === "warning"
            ? expired === 0 && critical === 0 && warning > 0
            : statusFilter === "valid"
              ? expired === 0 && critical === 0 && warning === 0
              : true;

    return matchSearch && matchStatus;
  });

  return (
    <div className="container-fluid p-0">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-4">
          <h2 className="fw-bold mb-1">Compliance Center</h2>
          <p className="text-muted mb-0">
            Certification Monitoring, Gap Analysis & Position Matching
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
          className="mb-4"
        >
          {[
            {
              icon: "⚠️",
              value: stats.expired,
              label: "Expired",
              key: "expired",
              bg: "#fff5f5",
              bar: "#dc3545",
              color: "text-danger",
            },
            {
              icon: "🔴",
              value: stats.critical,
              label: "Critical (<30 days)",
              key: "critical",
              bg: "#fff8e1",
              bar: "#ffc107",
              color: "text-warning",
            },
            {
              icon: "🟡",
              value: stats.warning,
              label: "Warning (30-60 days)",
              key: "warning",
              bg: "#e8f4fd",
              bar: "#0dcaf0",
              color: "text-info",
            },
            {
              icon: "✅",
              value: stats.valid,
              label: "Valid (>60 days)",
              key: "valid",
              bg: "#f0fff4",
              bar: "#198754",
              color: "text-success",
            },
          ].map((card) => (
            <div key={card.label} className="card shadow-sm border-0">
              <div className="card-body d-flex align-items-center gap-3 px-4 py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: card.bg,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{card.icon}</span>
                </div>
                <div>
                  <div
                    className={`${card.color} fw-bold`}
                    style={{ fontSize: "28px", lineHeight: 1 }}
                  >
                    {card.value}
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    {card.label}
                  </div>
                </div>
              </div>
              <div
                style={{
                  height: "4px",
                  background: card.bar,
                  borderRadius: "0 0 4px 4px",
                }}
              />
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
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
              placeholder="Search worker or position..."
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
            <option value="valid">✅ All Valid</option>
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
        </div>

        {/* Worker Compliance Overview */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <h6 className="fw-bold mb-0">Worker Compliance Overview</h6>
          </div>
          <div className="card-body p-0">
            <table
              className="table table-hover align-middle mb-0"
              style={{ fontSize: "13px" }}
            >
              <thead className="table-light">
                <tr>
                  <th className="ps-4 pe-4 py-2 text-dark fw-bold">Worker</th>
                  <th className="pe-4 py-2 text-dark fw-bold">Position</th>
                  <th
                    className="pe-4 py-2 text-dark fw-bold text-center"
                    style={{ width: "260px" }}
                  >
                    Compliance Alerts
                  </th>
                  <th className="pe-4 py-2 text-dark fw-bold text-center">
                    Chevron
                  </th>
                  <th className="pe-4 py-2 text-dark fw-bold text-center">
                    Erawan
                  </th>
                  <th className="pe-4 py-2 text-dark fw-bold text-center">
                    PTT
                  </th>
                  <th className="pe-4 py-2 text-dark fw-bold text-center">
                    Valeura
                  </th>
                  <th
                    className="pe-4 py-2 text-dark fw-bold text-center"
                    style={{ width: "120px" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w) => (
                  <tr key={w.id}>
                    <td className="ps-4 pe-4 py-2 fw-medium">{w.fullName}</td>
                    <td className="pe-4 py-2">{w.position?.name || "-"}</td>

                    <td
                      className="pe-4 py-2 text-center"
                      style={{ width: "260px" }}
                    >
                      {(() => {
                        const expired = w.alerts?.expired ?? 0;
                        const critical = w.alerts?.critical ?? 0;
                        const warning = w.alerts?.warning ?? 0;
                        return expired === 0 &&
                          critical === 0 &&
                          warning === 0 ? (
                          <span
                            className="badge bg-success px-2 py-1"
                            style={{ fontSize: "11px" }}
                          >
                            ✅ All Valid
                          </span>
                        ) : (
                          <div className="d-flex flex-wrap justify-content-center gap-1">
                            {expired > 0 && (
                              <span
                                className="badge bg-danger px-2 py-1"
                                style={{ fontSize: "11px" }}
                              >
                                🔴 {expired} Expired
                              </span>
                            )}
                            {critical > 0 && (
                              <span
                                className="badge bg-danger px-2 py-1"
                                style={{ fontSize: "11px" }}
                              >
                                🔥 {critical} Critical
                              </span>
                            )}
                            {warning > 0 && (
                              <span
                                className="badge bg-warning text-dark px-2 py-1"
                                style={{ fontSize: "11px" }}
                              >
                                🟡 {warning} Warning
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {["chevron", "erawan", "ptt", "valeura"].map((client) => (
                      <td key={client} className="pe-4 py-2 text-center">
                        <ClientCell
                          {...(w.clients?.[client] ?? { completed: null })}
                        />
                      </td>
                    ))}

                    <td className="pe-4 py-2 text-center">
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary px-2 py-0"
                          style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                          onClick={() => handleViewGap(w.id)}
                        >
                          Gap
                        </button>
                        <button
                          className="btn btn-sm btn-outline-warning px-2 py-0"
                          style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                          onClick={() => handleViewAlerts(w.id)}
                        >
                          Alerts
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gap Modal */}
      {showGapModal && selectedGap && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            overflowY: "auto",
            padding: "40px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              background: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
              <div>
                <h5 className="fw-bold mb-1">
                  Gap Analysis — {selectedGap.fullName}
                </h5>
                <div className="text-muted" style={{ fontSize: "13px" }}>
                  {selectedGap.position}
                </div>
              </div>
              <button className="btn-close" onClick={closeModal} />
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {Object.entries(selectedGap.clients).map(
                ([clientName, client]) => (
                  <div key={clientName} className="mb-4 p-4 rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold text-uppercase mb-0">
                        {clientName}
                      </h6>
                      <span
                        className={`badge px-3 py-2 ${
                          client.missing.length === 0
                            ? "bg-success"
                            : client.completed.length /
                                  client.required.length >=
                                0.8
                              ? "bg-warning text-dark"
                              : "bg-danger"
                        }`}
                      >
                        {Math.round(
                          (client.completed.length / client.required.length) *
                            100,
                        )}
                        % Match
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "0.75rem",
                      }}
                      className="mb-3"
                    >
                      <div
                        className="text-center p-2 rounded"
                        style={{ background: "#f0f4ff" }}
                      >
                        <div
                          className="fw-bold text-primary"
                          style={{ fontSize: "22px" }}
                        >
                          {client.required.length}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "12px" }}
                        >
                          Required
                        </div>
                      </div>
                      <div
                        className="text-center p-2 rounded"
                        style={{ background: "#f0fff4" }}
                      >
                        <div
                          className="fw-bold text-success"
                          style={{ fontSize: "22px" }}
                        >
                          {client.completed.length}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "12px" }}
                        >
                          Completed
                        </div>
                      </div>
                      <div
                        className="text-center p-2 rounded"
                        style={{ background: "#fff5f5" }}
                      >
                        <div
                          className="fw-bold text-danger"
                          style={{ fontSize: "22px" }}
                        >
                          {client.missing.length}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "12px" }}
                        >
                          Missing
                        </div>
                      </div>
                    </div>

                    {client.missing.length > 0 ? (
                      <div>
                        <div
                          className="fw-semibold text-danger mb-2"
                          style={{ fontSize: "13px" }}
                        >
                          Missing Training:
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {client.missing.map((training) => (
                            <span
                              key={training}
                              className="badge bg-danger bg-opacity-10 text-danger px-2 py-1"
                              style={{ fontSize: "12px" }}
                            >
                              ✕ {training}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-success fw-semibold"
                        style={{ fontSize: "13px" }}
                      >
                        ✅ All training completed
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Modal Footer — อยู่ในกล่องสีขาว */}
            <div className="p-4 border-top text-end">
              <button className="btn btn-secondary px-4" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && selectedAlert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999999,
            overflowY: "auto",
            padding: "40px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAlertModal();
          }}
        >
          <div
            style={{
              maxWidth: "700px",
              margin: "0 auto",
              background: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
              <div>
                <h5 className="fw-bold mb-2">
                  Compliance Alerts — {selectedAlert.fullName}
                </h5>
                <div className="d-flex gap-2">
                  {selectedAlert.expired.length > 0 && (
                    <span
                      className="badge bg-danger px-2 py-1"
                      style={{ fontSize: "11px" }}
                    >
                      🔴 {selectedAlert.expired.length} Expired
                    </span>
                  )}
                  {selectedAlert.critical.length > 0 && (
                    <span
                      className="badge bg-danger px-2 py-1"
                      style={{ fontSize: "11px" }}
                    >
                      🔥 {selectedAlert.critical.length} Critical
                    </span>
                  )}
                  {selectedAlert.warning.length > 0 && (
                    <span
                      className="badge bg-warning text-dark px-2 py-1"
                      style={{ fontSize: "11px" }}
                    >
                      🟡 {selectedAlert.warning.length} Warning
                    </span>
                  )}
                </div>
              </div>
              <button className="btn-close" onClick={closeAlertModal} />
            </div>
            <div className="p-4">
              {/* Expired */}
              {selectedAlert.expired.length > 0 && (
                <div className="mb-4">
                  <div
                    className="fw-bold text-danger mb-2"
                    style={{ fontSize: "14px" }}
                  >
                    🔴 Expired
                  </div>
                  {selectedAlert.expired.map((item, i) => (
                    <div
                      key={i}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom"
                    >
                      <div>
                        <span
                          className="badge bg-secondary me-2"
                          style={{ fontSize: "10px" }}
                        >
                          {item.type}
                        </span>
                        <span style={{ fontSize: "13px" }}>{item.name}</span>
                      </div>
                      <div className="text-danger" style={{ fontSize: "12px" }}>
                        {new Date(item.expiryDate).toLocaleDateString()} (
                        {Math.abs(item.daysLeft)} days ago)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Critical */}
              {selectedAlert.critical.length > 0 && (
                <div className="mb-4">
                  <div
                    className="fw-bold text-warning mb-2"
                    style={{ fontSize: "14px" }}
                  >
                    🔥 Critical (&lt;30 days)
                  </div>
                  {selectedAlert.critical.map((item, i) => (
                    <div
                      key={i}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom"
                    >
                      <div>
                        <span
                          className="badge bg-secondary me-2"
                          style={{ fontSize: "10px" }}
                        >
                          {item.type}
                        </span>
                        <span style={{ fontSize: "13px" }}>{item.name}</span>
                      </div>
                      <div
                        className="text-warning fw-semibold"
                        style={{ fontSize: "12px" }}
                      >
                        {new Date(item.expiryDate).toLocaleDateString()} (
                        {item.daysLeft} days left)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning */}
              {selectedAlert.warning.length > 0 && (
                <div className="mb-4">
                  <div
                    className="fw-bold text-info mb-2"
                    style={{ fontSize: "14px" }}
                  >
                    🟡 Warning (30-60 days)
                  </div>
                  {selectedAlert.warning.map((item, i) => (
                    <div
                      key={i}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom"
                    >
                      <div>
                        <span
                          className="badge bg-secondary me-2"
                          style={{ fontSize: "10px" }}
                        >
                          {item.type}
                        </span>
                        <span style={{ fontSize: "13px" }}>{item.name}</span>
                      </div>
                      <div
                        className="text-info fw-semibold"
                        style={{ fontSize: "12px" }}
                      >
                        {new Date(item.expiryDate).toLocaleDateString()} (
                        {item.daysLeft} days left)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedAlert.expired.length === 0 &&
                selectedAlert.critical.length === 0 &&
                selectedAlert.warning.length === 0 && (
                  <div className="text-success fw-semibold text-center py-4">
                    ✅ All certifications valid
                  </div>
                )}
            </div>

            <div className="p-4 border-top text-end">
              <button
                className="btn btn-secondary px-4"
                onClick={closeAlertModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
