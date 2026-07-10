import { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ตรงกับ enum TrainingSource ใน schema.prisma
const SOURCE_OPTIONS = [
  { value: "CLIENT_INTERNAL", label: "Client Internal" },
  { value: "TPTI", label: "TPTI" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "PUBLIC", label: "Public" },
];

const emptyStandardForm = {
  id: null,
  source: "PUBLIC",
  clientId: "",
  trainingHours: "",
  validityDays: "",
  isNoExpiry: false,
};

const emptyTrainingForm = {
  id: null,
  name: "",
  fullName: "",
  description: "",
};

export default function ManageTrainings() {
  const { backendUrl } = useContext(AppContent);

  // ----- list state -----
  const [trainings, setTrainings] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [listMsg, setListMsg] = useState(null);

  // ----- clients (สำหรับ dropdown source = CLIENT_INTERNAL) -----
  const [clients, setClients] = useState([]);

  // ----- edit panel state -----
  const [selectedId, setSelectedId] = useState(null); // null = ปิด panel, "new" = สร้างใหม่
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
  const [standards, setStandards] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingTraining, setSavingTraining] = useState(false);
  const [detailMsg, setDetailMsg] = useState(null);

  // ----- standard sub-form (modal เล็กในหน้าเดียว) -----
  const [standardForm, setStandardForm] = useState(null); // null = ปิด, object = เปิดฟอร์ม
  const [savingStandard, setSavingStandard] = useState(false);

  // โหลด list trainings
  const loadTrainings = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await axios.get(`${backendUrl}/api/global-trainings`, {
        params: { search: search || undefined },
        withCredentials: true,
      });
      setTrainings(res.data || []);
    } catch (err) {
      console.error(err);
      setListMsg({ type: "err", text: "โหลดรายการ training ไม่สำเร็จ" });
    } finally {
      setLoadingList(false);
    }
  }, [backendUrl, search]);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  // โหลด clients ครั้งเดียว (สำหรับ dropdown ใน standard form)
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/clients`, {
          withCredentials: true,
        });
        setClients(res.data || []);
      } catch (err) {
        console.error(err);
        // ไม่ critical พอ ไม่ block หน้าหลัก แค่ dropdown client จะว่าง
      }
    })();
  }, [backendUrl]);

  // เปิด edit panel ของ training ที่มีอยู่แล้ว
  const openTraining = async (id) => {
    setSelectedId(id);
    setDetailMsg(null);
    setStandardForm(null);
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${backendUrl}/api/global-trainings/${id}`, {
        withCredentials: true,
      });
      setTrainingForm({
        id: res.data.id,
        name: res.data.name || "",
        fullName: res.data.fullName || "",
        description: res.data.description || "",
      });
      setStandards(res.data.trainingStandards || []);
    } catch (err) {
      console.error(err);
      setDetailMsg({ type: "err", text: "โหลดข้อมูล training ไม่สำเร็จ" });
    } finally {
      setLoadingDetail(false);
    }
  };

  // เปิด panel สำหรับสร้าง training ใหม่
  const openNewTraining = () => {
    setSelectedId("new");
    setTrainingForm(emptyTrainingForm);
    setStandards([]);
    setDetailMsg(null);
    setStandardForm(null);
  };

  const closePanel = () => {
    setSelectedId(null);
    setTrainingForm(emptyTrainingForm);
    setStandards([]);
    setStandardForm(null);
    setDetailMsg(null);
  };

  // บันทึก GlobalTraining (create หรือ update)
  const handleSaveTraining = async () => {
    if (!trainingForm.name.trim()) {
      setDetailMsg({ type: "err", text: "กรุณากรอกชื่อ training (name)" });
      return;
    }
    try {
      setSavingTraining(true);
      setDetailMsg(null);
      const payload = {
        name: trainingForm.name.trim(),
        fullName: trainingForm.fullName.trim() || null,
        description: trainingForm.description.trim() || null,
      };

      if (selectedId === "new") {
        const res = await axios.post(
          `${backendUrl}/api/global-trainings`,
          payload,
          { withCredentials: true },
        );
        setDetailMsg({ type: "ok", text: "สร้าง training ใหม่สำเร็จ" });
        setSelectedId(res.data.id);
        setTrainingForm((prev) => ({ ...prev, id: res.data.id }));
      } else {
        await axios.put(
          `${backendUrl}/api/global-trainings/${selectedId}`,
          payload,
          { withCredentials: true },
        );
        setDetailMsg({ type: "ok", text: "บันทึกการแก้ไขสำเร็จ" });
      }
      loadTrainings();
    } catch (err) {
      setDetailMsg({
        type: "err",
        text: err.response?.data?.message || "บันทึก training ไม่สำเร็จ",
      });
    } finally {
      setSavingTraining(false);
    }
  };

  // ลบ GlobalTraining — ปิดปุ่มถ้ามี standard ผูกอยู่ (guard ฝั่ง frontend, backend ควร guard ซ้ำด้วย)
  const handleDeleteTraining = async () => {
    if (standards.length > 0) {
      setDetailMsg({
        type: "err",
        text: `ลบไม่ได้ — มี ${standards.length} training standard ผูกอยู่ กรุณาลบ standard ทั้งหมดก่อน`,
      });
      return;
    }
    if (!window.confirm(`ยืนยันลบ training "${trainingForm.name}" ?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/global-trainings/${selectedId}`, {
        withCredentials: true,
      });
      closePanel();
      loadTrainings();
    } catch (err) {
      setDetailMsg({
        type: "err",
        text:
          err.response?.data?.message ||
          "ลบไม่สำเร็จ — training นี้อาจถูกใช้งานอยู่ในระบบ (employee training / candidate gap)",
      });
    }
  };

  // ----- Standard sub-form -----

  const openNewStandard = () => {
    setStandardForm({ ...emptyStandardForm });
  };

  const openEditStandard = (std) => {
    setStandardForm({
      id: std.id,
      source: std.source,
      clientId: std.clientId || "",
      trainingHours: std.trainingHours ?? "",
      validityDays: std.validityDays ?? "",
      isNoExpiry: !!std.isNoExpiry,
    });
  };

  const closeStandardForm = () => setStandardForm(null);

  // เช็ค unique constraint [globalTrainingId, source, clientId] ฝั่ง frontend ก่อนยิง save
  const findDuplicateStandard = (form) => {
    const clientIdNormalized =
      form.source === "CLIENT_INTERNAL" ? form.clientId || null : null;
    return standards.find(
      (s) =>
        s.id !== form.id &&
        s.source === form.source &&
        (s.clientId || null) === clientIdNormalized,
    );
  };

  const handleSaveStandard = async () => {
    if (standardForm.source === "CLIENT_INTERNAL" && !standardForm.clientId) {
      setDetailMsg({
        type: "err",
        text: "source = Client Internal ต้องเลือก client ด้วย",
      });
      return;
    }

    const duplicate = findDuplicateStandard(standardForm);
    if (duplicate) {
      const clientLabel =
        clients.find((c) => c.id === duplicate.clientId)?.name || "-";
      setDetailMsg({
        type: "err",
        text: `มี standard สำหรับ source นี้${
          standardForm.source === "CLIENT_INTERNAL"
            ? ` + client "${clientLabel}"`
            : ""
        } อยู่แล้ว — แก้ standard เดิมแทนการสร้างซ้ำ`,
      });
      return;
    }

    try {
      setSavingStandard(true);
      setDetailMsg(null);
      const payload = {
        source: standardForm.source,
        clientId:
          standardForm.source === "CLIENT_INTERNAL"
            ? standardForm.clientId
            : null,
        trainingHours:
          standardForm.trainingHours === ""
            ? null
            : Number(standardForm.trainingHours),
        validityDays: standardForm.isNoExpiry
          ? null
          : standardForm.validityDays === ""
            ? null
            : Number(standardForm.validityDays),
        isNoExpiry: standardForm.isNoExpiry,
      };

      if (standardForm.id) {
        await axios.put(
          `${backendUrl}/api/global-trainings/${selectedId}/standards/${standardForm.id}`,
          payload,
          { withCredentials: true },
        );
      } else {
        await axios.post(
          `${backendUrl}/api/global-trainings/${selectedId}/standards`,
          payload,
          { withCredentials: true },
        );
      }
      await openTraining(selectedId); // reload standards list
      setStandardForm(null);
      setDetailMsg({ type: "ok", text: "บันทึก standard สำเร็จ" });
    } catch (err) {
      setDetailMsg({
        type: "err",
        text: err.response?.data?.message || "บันทึก standard ไม่สำเร็จ",
      });
    } finally {
      setSavingStandard(false);
    }
  };

  const handleDeleteStandard = async (std) => {
    if (std._clientTrainingCount > 0) {
      setDetailMsg({
        type: "err",
        text: `ลบไม่ได้ — standard นี้ถูกใช้อยู่ใน ${std._clientTrainingCount} contract`,
      });
      return;
    }
    if (!window.confirm("ยืนยันลบ training standard นี้?")) return;
    try {
      await axios.delete(
        `${backendUrl}/api/global-trainings/${selectedId}/standards/${std.id}`,
        { withCredentials: true },
      );
      await openTraining(selectedId);
    } catch (err) {
      setDetailMsg({
        type: "err",
        text:
          err.response?.data?.message ||
          "ลบไม่สำเร็จ — standard นี้อาจถูกใช้งานอยู่ในบาง contract",
      });
    }
  };

  // ----- shared styles (ตามสไตล์ MatrixEditor.jsx) -----
  const cardStyle = {
    background: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
  };
  const labelStyle = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6c757d",
    marginBottom: "6px",
    display: "block",
  };
  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };
  const btnPrimary = {
    background: "#0d6efd",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 18px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnGhost = {
    background: "#fff",
    color: "#495057",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnDanger = {
    background: "#fff",
    color: "#dc3545",
    border: "1px solid #f5c6cb",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  };

  const MessageBanner = ({ msg }) =>
    !msg ? null : (
      <div
        style={{
          background: msg.type === "ok" ? "#d1e7dd" : "#f8d7da",
          color: msg.type === "ok" ? "#0f5132" : "#842029",
          border: `1px solid ${msg.type === "ok" ? "#badbcc" : "#f5c6cb"}`,
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "13px",
          marginBottom: "1rem",
        }}
      >
        {msg.type === "ok" ? "✅ " : "⚠ "}
        {msg.text}
      </div>
    );

  const panelOpen = selectedId !== null;

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{ ...cardStyle, padding: "16px 24px", marginBottom: "1rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🎓</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Manage Trainings
            </span>
            <span style={{ color: "#6c757d", fontSize: "12px" }}>
              จัดการ training กลาง (Global Training) และ standard ต่อ
              client/source
            </span>
          </div>
        </div>

        <MessageBanner msg={listMsg} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: panelOpen ? "1fr 1fr" : "1fr",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          {/* ---------- LIST VIEW ---------- */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px 20px",
                borderBottom: "1px solid #f1f3f5",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="ค้นหา training..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, width: "240px" }}
              />
              <button style={btnPrimary} onClick={openNewTraining}>
                + Add Training
              </button>
            </div>

            {loadingList ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6c757d",
                }}
              >
                Loading...
              </div>
            ) : trainings.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: "13px",
                }}
              >
                ไม่พบ training
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 20px",
                        fontSize: "11px",
                        color: "#6c757d",
                      }}
                    >
                      NAME
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 20px",
                        fontSize: "11px",
                        color: "#6c757d",
                        width: "120px",
                      }}
                    >
                      STANDARDS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openTraining(t.id)}
                      style={{
                        borderBottom: "1px solid #f8f9fa",
                        cursor: "pointer",
                        background: selectedId === t.id ? "#fcfdff" : "#fff",
                      }}
                    >
                      <td style={{ padding: "10px 20px" }}>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        {t.fullName && t.fullName !== t.name && (
                          <div style={{ color: "#adb5bd", fontSize: "11px" }}>
                            {t.fullName}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 20px",
                          textAlign: "right",
                          color: "#6c757d",
                        }}
                      >
                        {t._count?.trainingStandards ?? t.standardsCount ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ---------- EDIT PANEL ---------- */}
          {panelOpen && (
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: "1px solid #f1f3f5",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "14px" }}>
                  {selectedId === "new" ? "Add Training" : "Edit Training"}
                </span>
                <button
                  onClick={closePanel}
                  style={{ ...btnGhost, padding: "4px 10px" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                <MessageBanner msg={detailMsg} />

                {loadingDetail ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#6c757d",
                    }}
                  >
                    Loading...
                  </div>
                ) : (
                  <>
                    {/* --- GlobalTraining fields --- */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={labelStyle}>NAME *</label>
                      <input
                        style={inputStyle}
                        value={trainingForm.name}
                        onChange={(e) =>
                          setTrainingForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                        placeholder="เช่น Basic Rigging"
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={labelStyle}>FULL NAME (สำหรับแสดงผล)</label>
                      <input
                        style={inputStyle}
                        value={trainingForm.fullName}
                        onChange={(e) =>
                          setTrainingForm((f) => ({
                            ...f,
                            fullName: e.target.value,
                          }))
                        }
                        placeholder="ชื่อเต็มจาก Excel (ถ้ามี)"
                      />
                    </div>
                    <div style={{ marginBottom: "18px" }}>
                      <label style={labelStyle}>DESCRIPTION</label>
                      <textarea
                        style={{
                          ...inputStyle,
                          minHeight: "70px",
                          resize: "vertical",
                        }}
                        value={trainingForm.description}
                        onChange={(e) =>
                          setTrainingForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "24px",
                      }}
                    >
                      <button
                        style={btnPrimary}
                        onClick={handleSaveTraining}
                        disabled={savingTraining}
                      >
                        {savingTraining ? "Saving..." : "Save"}
                      </button>
                      {selectedId !== "new" && (
                        <button
                          style={btnDanger}
                          onClick={handleDeleteTraining}
                        >
                          Delete Training
                        </button>
                      )}
                    </div>

                    {/* --- Training Standards sub-list --- */}
                    {selectedId !== "new" && (
                      <div
                        style={{
                          borderTop: "1px solid #f1f3f5",
                          paddingTop: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: "13px" }}>
                            Training Standards ({standards.length})
                          </span>
                          <button
                            style={{ ...btnGhost, padding: "6px 12px" }}
                            onClick={openNewStandard}
                          >
                            + Add Standard
                          </button>
                        </div>

                        {standards.length === 0 ? (
                          <div
                            style={{
                              color: "#adb5bd",
                              fontSize: "12px",
                              padding: "8px 0",
                            }}
                          >
                            ยังไม่มี standard — training
                            นี้ยังไม่ระบุชั่วโมง/อายุ cert
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            {standards.map((std) => (
                              <div
                                key={std.id}
                                style={{
                                  border: "1px solid #f1f3f5",
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "12px",
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600 }}>
                                    {SOURCE_OPTIONS.find(
                                      (s) => s.value === std.source,
                                    )?.label || std.source}
                                  </span>
                                  {std.source === "CLIENT_INTERNAL" &&
                                    std.client && (
                                      <span style={{ color: "#6c757d" }}>
                                        {" "}
                                        · {std.client.name}
                                      </span>
                                    )}
                                  <div
                                    style={{
                                      color: "#adb5bd",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {std.trainingHours != null &&
                                      `${std.trainingHours} hrs · `}
                                    {std.isNoExpiry
                                      ? "No expiry"
                                      : std.validityDays != null
                                        ? `${std.validityDays} days validity`
                                        : "—"}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    style={{ ...btnGhost, padding: "5px 10px" }}
                                    onClick={() => openEditStandard(std)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    style={btnDanger}
                                    onClick={() => handleDeleteStandard(std)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* --- Standard form --- */}
                        {standardForm && (
                          <div
                            style={{
                              marginTop: "14px",
                              border: "1px solid #dee2e6",
                              borderRadius: "8px",
                              padding: "16px",
                              background: "#f8fbff",
                            }}
                          >
                            <div style={{ marginBottom: "12px" }}>
                              <label style={labelStyle}>SOURCE</label>
                              <select
                                style={inputStyle}
                                value={standardForm.source}
                                onChange={(e) =>
                                  setStandardForm((f) => ({
                                    ...f,
                                    source: e.target.value,
                                    clientId:
                                      e.target.value === "CLIENT_INTERNAL"
                                        ? f.clientId
                                        : "",
                                  }))
                                }
                              >
                                {SOURCE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {standardForm.source === "CLIENT_INTERNAL" && (
                              <div style={{ marginBottom: "12px" }}>
                                <label style={labelStyle}>CLIENT *</label>
                                <select
                                  style={inputStyle}
                                  value={standardForm.clientId}
                                  onChange={(e) =>
                                    setStandardForm((f) => ({
                                      ...f,
                                      clientId: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">— เลือก client —</option>
                                  {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                marginBottom: "12px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <label style={labelStyle}>TRAINING HOURS</label>
                                <input
                                  type="number"
                                  min="0"
                                  style={inputStyle}
                                  value={standardForm.trainingHours}
                                  onChange={(e) =>
                                    setStandardForm((f) => ({
                                      ...f,
                                      trainingHours: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={labelStyle}>
                                  VALIDITY (DAYS)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={standardForm.isNoExpiry}
                                  style={{
                                    ...inputStyle,
                                    background: standardForm.isNoExpiry
                                      ? "#f1f3f5"
                                      : "#fff",
                                  }}
                                  value={standardForm.validityDays}
                                  onChange={(e) =>
                                    setStandardForm((f) => ({
                                      ...f,
                                      validityDays: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "12px",
                                color: "#495057",
                                marginBottom: "16px",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={standardForm.isNoExpiry}
                                onChange={(e) =>
                                  setStandardForm((f) => ({
                                    ...f,
                                    isNoExpiry: e.target.checked,
                                    validityDays: e.target.checked
                                      ? ""
                                      : f.validityDays,
                                  }))
                                }
                              />
                              No expiry (cert ไม่มีวันหมดอายุ)
                            </label>

                            <div style={{ display: "flex", gap: "10px" }}>
                              <button
                                style={btnPrimary}
                                onClick={handleSaveStandard}
                                disabled={savingStandard}
                              >
                                {savingStandard ? "Saving..." : "Save Standard"}
                              </button>
                              <button
                                style={btnGhost}
                                onClick={closeStandardForm}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
