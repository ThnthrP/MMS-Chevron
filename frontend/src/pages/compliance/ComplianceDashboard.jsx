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
    if (completed === null) return <span style={{ color: "#6c757d" }}>—</span>;
    const color = missing === 0 ? "#198754" : "#dc3545";
    return (
      <div>
        <div style={{ fontSize: "13px", color, fontWeight: 600 }}>
          {missing === 0 ? "Complete" : `${missing} Missing`}
        </div>
        <div style={{ fontSize: "11px", color: "#6c757d" }}>
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

  // Medical notes popup: { name, note }
  const [noteModal, setNoteModal] = useState(null);

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

  const badge = (bg, color, text) => (
    <span
      style={{
        background: bg,
        color,
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "11px",
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );

  // ── Medical: หา record "Medical Check up" ของ worker ──
  const getMedical = (w) =>
    (w.medicalChecks || []).find((m) => m.checkType === "Medical Check up") ||
    null;

  // map CheckStatus enum -> label + สี
  const medicalStatusInfo = (status) => {
    switch (status) {
      case "passed":
        return { label: "Fit", bg: "#d1e7dd", color: "#0f5132" };
      case "pending":
        return { label: "Pending", bg: "#fff3cd", color: "#664d03" };
      case "failed":
        return { label: "Unfit", bg: "#f8d7da", color: "#842029" };
      case "not_required":
        return { label: "Fit w/ Restriction", bg: "#e8f0ff", color: "#0d6efd" };
      case "overdue":
        return { label: "Overdue", bg: "#f8d7da", color: "#842029" };
      case "due_soon":
        return { label: "Due Soon", bg: "#fff3cd", color: "#664d03" };
      default:
        return { label: status || "N/A", bg: "#f1f3f5", color: "#6c757d" };
    }
  };

  return (
    <div className="container-fluid p-4">
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Compliance Center
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
              Phase 2
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "#6c757d" }}>
            Certification Monitoring, Gap Analysis & Position Matching
          </div>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            {
              icon: "🔴",
              value: stats.expired,
              label: "Expired",
              key: "expired",
              bg: "#fff5f5",
              bar: "#dc3545",
              color: "#dc3545",
            },
            {
              icon: "🔥",
              value: stats.critical,
              label: "Critical (<30 days)",
              key: "critical",
              bg: "#fff8e1",
              bar: "#ffc107",
              color: "#cc8400",
            },
            {
              icon: "🟡",
              value: stats.warning,
              label: "Warning (30-60 days)",
              key: "warning",
              bg: "#e8f4fd",
              bar: "#0dcaf0",
              color: "#0aa2c0",
            },
            {
              icon: "✅",
              value: stats.valid,
              label: "Valid (>60 days or no expiry)",
              key: "valid",
              bg: "#f0fff4",
              bar: "#198754",
              color: "#198754",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "10px",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() =>
                setStatusFilter(statusFilter === card.key ? "all" : card.key)
              }
            >
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: card.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{card.icon}</span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: card.color,
                      lineHeight: 1,
                    }}
                  >
                    {card.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    {card.label}
                  </div>
                </div>
              </div>
              <div style={{ height: "4px", background: card.bar }} />
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
            {/* <option value="valid">✅ All Valid</option> */}
            <option value="valid">✅ No Alerts</option>
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

        {/* Worker Compliance Table */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{ padding: "14px 20px", borderBottom: "1px solid #dee2e6" }}
          >
            <span style={{ fontWeight: 700, fontSize: "14px" }}>
              Worker Compliance Overview
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
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                {[
                  ["WORKER", "left"],
                  ["POSITION", "left"],
                  ["DEPARTMENT", "left"],
                  ["COMPLIANCE ALERTS", "center"],
                  ["CHEVRON MATCH", "center"],
                  ["MEDICAL", "center"],
                  ["ACTIONS", "center"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#6c757d",
                      letterSpacing: "0.5px",
                      textAlign: align,
                      background: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((w, idx) => (
                <tr
                  key={w.id}
                  style={{
                    borderBottom:
                      idx < filteredWorkers.length - 1
                        ? "1px solid #f1f3f5"
                        : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f9fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }
                >
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600 }}>{w.fullName}</div>
                    {w.empCode && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#6c757d",
                          fontFamily: "monospace",
                        }}
                      >
                        {w.empCode}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#6c757d" }}>
                    {w.position?.name || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#6c757d",
                    }}
                  >
                    {w.department || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {(() => {
                      const expired = w.alerts?.expired ?? 0;
                      const critical = w.alerts?.critical ?? 0;
                      const warning = w.alerts?.warning ?? 0;
                      return expired === 0 &&
                        critical === 0 &&
                        warning === 0 ? (
                        // badge("#d1e7dd", "#0f5132", "✅ All Valid")
                        badge("#d1e7dd", "#0f5132", "✅ No Alerts")
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {expired > 0 &&
                            badge(
                              "#f8d7da",
                              "#842029",
                              `🔴 ${expired} Expired`,
                            )}
                          {critical > 0 &&
                            badge(
                              "#f8d7da",
                              "#842029",
                              `🔥 ${critical} Critical`,
                            )}
                          {warning > 0 &&
                            badge(
                              "#fff3cd",
                              "#664d03",
                              `🟡 ${warning} Warning`,
                            )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* CHEVRON */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <ClientCell
                      {...(w.clients?.chevron ?? { completed: null })}
                    />
                  </td>

                  {/* MEDICAL */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {(() => {
                      const med = getMedical(w);
                      if (!med)
                        return <span style={{ color: "#6c757d" }}>—</span>;
                      const info = medicalStatusInfo(med.status);
                      const exp = med.expiryDate
                        ? new Date(med.expiryDate)
                        : null;
                      const expired =
                        exp && !isNaN(exp.getTime()) && exp < new Date();
                      return (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {badge(info.bg, info.color, info.label)}
                          <div
                            style={{
                              fontSize: "11px",
                              color: expired ? "#dc3545" : "#6c757d",
                            }}
                          >
                            {exp && !isNaN(exp.getTime())
                              ? `Exp: ${exp.toLocaleDateString()}`
                              : "No expiry"}
                          </div>
                          {med.notes && (
                            <button
                              onClick={() =>
                                setNoteModal({
                                  name: w.fullName,
                                  note: med.notes,
                                })
                              }
                              title="View medical notes"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              📄
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <button
                        onClick={() => handleViewGap(w.id)}
                        style={{
                          background: "#fff",
                          border: "1px solid #0d6efd",
                          color: "#0d6efd",
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Gap
                      </button>
                      <button
                        onClick={() => handleViewAlerts(w.id)}
                        style={{
                          background: "#fff",
                          border: "1px solid #ffc107",
                          color: "#664d03",
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
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
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    marginBottom: "4px",
                  }}
                >
                  Gap Analysis — {selectedGap.fullName}
                </div>
                <div style={{ fontSize: "13px", color: "#6c757d" }}>
                  {selectedGap.position}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              {Object.entries(selectedGap.clients).map(
                ([clientName, client]) => (
                  <div
                    key={clientName}
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "10px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          textTransform: "uppercase",
                        }}
                      >
                        {clientName}
                      </span>
                      <span
                        style={{
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background:
                            client.missing.length === 0
                              ? "#d1e7dd"
                              : client.completed.length /
                                    client.required.length >=
                                  0.8
                                ? "#fff3cd"
                                : "#f8d7da",
                          color:
                            client.missing.length === 0
                              ? "#0f5132"
                              : client.completed.length /
                                    client.required.length >=
                                  0.8
                                ? "#664d03"
                                : "#842029",
                        }}
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
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      {[
                        {
                          label: "Required",
                          value: client.required.length,
                          bg: "#e8f0ff",
                          color: "#0d6efd",
                        },
                        {
                          label: "Completed",
                          value: client.completed.length,
                          bg: "#f0fff4",
                          color: "#198754",
                        },
                        {
                          label: "Missing",
                          value: client.missing.length,
                          bg: "#fff5f5",
                          color: "#dc3545",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          style={{
                            background: s.bg,
                            borderRadius: "8px",
                            padding: "12px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "22px",
                              fontWeight: 700,
                              color: s.color,
                            }}
                          >
                            {s.value}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6c757d" }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {client.missing.length > 0 ? (
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#dc3545",
                            marginBottom: "8px",
                          }}
                        >
                          Missing Training:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {client.missing.map((t) => (
                            <span
                              key={t}
                              style={{
                                background: "#fff5f5",
                                color: "#dc3545",
                                border: "1px solid #f5c6cb",
                                borderRadius: "6px",
                                padding: "3px 10px",
                                fontSize: "12px",
                              }}
                            >
                              ✕ {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#198754",
                        }}
                      >
                        ✅ All training completed
                      </div>
                    )}
                    {client.completed.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#198754",
                            marginBottom: "8px",
                          }}
                        >
                          Completed Training:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {client.completed.map((t) => (
                            <span
                              key={t}
                              style={{
                                background: "#f0fff4",
                                color: "#198754",
                                border: "1px solid #b2dfdb",
                                borderRadius: "6px",
                                padding: "3px 10px",
                                fontSize: "12px",
                              }}
                            >
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #dee2e6",
                textAlign: "right",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "8px 24px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#6c757d",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
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
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    marginBottom: "8px",
                  }}
                >
                  Compliance Alerts — {selectedAlert.fullName}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {selectedAlert.expired.length > 0 &&
                    badge(
                      "#f8d7da",
                      "#842029",
                      `🔴 ${selectedAlert.expired.length} Expired`,
                    )}
                  {selectedAlert.critical.length > 0 &&
                    badge(
                      "#f8d7da",
                      "#842029",
                      `🔥 ${selectedAlert.critical.length} Critical`,
                    )}
                  {selectedAlert.warning.length > 0 &&
                    badge(
                      "#fff3cd",
                      "#664d03",
                      `🟡 ${selectedAlert.warning.length} Warning`,
                    )}
                </div>
              </div>
              <button
                onClick={closeAlertModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              {[
                {
                  items: selectedAlert.expired,
                  label: "🔴 Expired",
                  color: "#dc3545",
                },
                {
                  items: selectedAlert.critical,
                  label: "🔥 Critical (<30 days)",
                  color: "#ffc107",
                },
                {
                  items: selectedAlert.warning,
                  label: "🟡 Warning (30-60 days)",
                  color: "#0dcaf0",
                },
              ].map(
                ({ items, label, color }) =>
                  items.length > 0 && (
                    <div key={label} style={{ marginBottom: "24px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color,
                          fontSize: "14px",
                          marginBottom: "8px",
                        }}
                      >
                        {label}
                      </div>
                      {items.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 0",
                            borderBottom: "1px solid #f1f3f5",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                background: "#e9ecef",
                                color: "#495057",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                            >
                              {item.type}
                            </span>
                            <span style={{ fontSize: "13px" }}>
                              {item.name}
                            </span>
                          </div>
                          <div
                            style={{ fontSize: "12px", color, fontWeight: 600 }}
                          >
                            {new Date(item.expiryDate).toLocaleDateString()} (
                            {Math.abs(item.daysLeft)} days{" "}
                            {item.daysLeft < 0 ? "ago" : "left"})
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
              )}
              {selectedAlert.expired.length === 0 &&
                selectedAlert.critical.length === 0 &&
                selectedAlert.warning.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "#198754",
                      fontWeight: 600,
                    }}
                  >
                    ✅ All certifications valid
                  </div>
                )}
            </div>
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #dee2e6",
                textAlign: "right",
              }}
            >
              <button
                onClick={closeAlertModal}
                style={{
                  padding: "8px 24px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#6c757d",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Notes Modal */}
      {noteModal && (
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
            if (e.target === e.currentTarget) setNoteModal(null);
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              margin: "0 auto",
              background: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "15px" }}>
                📄 Medical Notes — {noteModal.name}
              </div>
              <button
                onClick={() => setNoteModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                padding: "22px",
                fontSize: "14px",
                color: "#212529",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {noteModal.note}
            </div>
            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid #dee2e6",
                textAlign: "right",
              }}
            >
              <button
                onClick={() => setNoteModal(null)}
                style={{
                  padding: "8px 24px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#6c757d",
                  color: "#fff",
                  cursor: "pointer",
                }}
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
