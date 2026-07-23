import { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ตรงกับ enum TrainingSource ใน schema.prisma
const SOURCE_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "COMPANY_ELEARNING", label: "Company e-learning" },
  { value: "TPTI", label: "TPTI" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "PUBLIC", label: "Public" },
];

// รวม GlobalTraining + TrainingStandard (1 training = 1 standard) เป็นฟอร์มเดียว
const emptyForm = {
  id: null,
  name: "",
  fullName: "",
  description: "",
  standardId: null, // มีค่า = standard นี้มีอยู่แล้วใน DB (update) / null = ยังไม่มี (create ตอน save)
  source: "PUBLIC",
  clientId: "",
  trainingHours: "",
  validityYears: "", // เก็บเป็น "ปี" ในฟอร์ม แปลงเป็น/จาก validityDays ตอนโหลด-บันทึก
  isNoExpiry: false,
};

const daysToYears = (days) => {
  if (days == null) return "";
  const y = days / 365;
  return Number.isInteger(y) ? String(y) : String(Math.round(y * 10) / 10);
};
const yearsToDays = (years) => {
  if (years === "" || years == null) return null;
  return Math.round(Number(years) * 365);
};

export default function ManageTrainings() {
  const { backendUrl } = useContext(AppContent);

  // ----- list state -----
  const [trainings, setTrainings] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [listMsg, setListMsg] = useState(null);

  // ----- clients (สำหรับ dropdown source = COMPANY) -----
  const [clients, setClients] = useState([]);

  // ----- edit panel state -----
  const [selectedId, setSelectedId] = useState(null); // null = ปิด panel, "new" = สร้างใหม่
  const [form, setForm] = useState(emptyForm);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailMsg, setDetailMsg] = useState(null);

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

  // โหลด clients ครั้งเดียว (สำหรับ dropdown ตอน source = COMPANY)
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

  // เปิด edit panel ของ training ที่มีอยู่แล้ว — ดึง standard ตัวแรก (ตัวเดียว) มาเติมในฟอร์มเดียวกันเลย
  const openTraining = async (id) => {
    setSelectedId(id);
    setDetailMsg(null);
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${backendUrl}/api/global-trainings/${id}`, {
        withCredentials: true,
      });
      const std = (res.data.trainingStandards || [])[0] || null;
      setForm({
        id: res.data.id,
        name: res.data.name || "",
        fullName: res.data.fullName || "",
        description: res.data.description || "",
        standardId: std?.id ?? null,
        source: std?.source ?? "PUBLIC",
        clientId: std?.clientId ?? "",
        trainingHours: std?.trainingHours ?? "",
        validityYears: std?.isNoExpiry ? "" : daysToYears(std?.validityDays),
        isNoExpiry: !!std?.isNoExpiry,
      });
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
    setForm(emptyForm);
    setDetailMsg(null);
  };

  const closePanel = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setDetailMsg(null);
  };

  // บันทึกทั้ง GlobalTraining + Standard พร้อมกันในปุ่มเดียว
  const handleSave = async () => {
    if (!form.name.trim()) {
      setDetailMsg({ type: "err", text: "กรุณากรอกชื่อ training (name)" });
      return;
    }
    if (form.source === "COMPANY" && !form.clientId) {
      setDetailMsg({
        type: "err",
        text: "source = Company ต้องเลือก client ด้วย",
      });
      return;
    }

    try {
      setSaving(true);
      setDetailMsg(null);

      // 1) save GlobalTraining ก่อน (create หรือ update)
      const trainingPayload = {
        name: form.name.trim(),
        fullName: form.fullName.trim() || null,
        description: form.description.trim() || null,
      };

      let trainingId = form.id;
      if (selectedId === "new") {
        const res = await axios.post(
          `${backendUrl}/api/global-trainings`,
          trainingPayload,
          { withCredentials: true },
        );
        trainingId = res.data.id;
      } else {
        await axios.put(
          `${backendUrl}/api/global-trainings/${trainingId}`,
          trainingPayload,
          { withCredentials: true },
        );
      }

      // 2) save Standard (create ถ้ายังไม่มี / update ถ้ามีแล้ว)
      const standardPayload = {
        source: form.source,
        clientId: form.source === "COMPANY" ? form.clientId : null,
        trainingHours:
          form.trainingHours === "" ? null : Number(form.trainingHours),
        validityDays: form.isNoExpiry ? null : yearsToDays(form.validityYears),
        isNoExpiry: form.isNoExpiry,
      };

      if (form.standardId) {
        await axios.put(
          `${backendUrl}/api/global-trainings/${trainingId}/standards/${form.standardId}`,
          standardPayload,
          { withCredentials: true },
        );
      } else {
        await axios.post(
          `${backendUrl}/api/global-trainings/${trainingId}/standards`,
          standardPayload,
          { withCredentials: true },
        );
      }

      setDetailMsg({ type: "ok", text: "บันทึกสำเร็จ" });
      loadTrainings();
      await openTraining(trainingId); // reload ฟอร์มให้ตรงกับข้อมูลล่าสุด (ได้ standardId ใหม่ถ้าเพิ่งสร้าง)
    } catch (err) {
      setDetailMsg({
        type: "err",
        text: err.response?.data?.message || "บันทึกไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  // ลบ standard เดี่ยว (ถ้ามี) — ใช้ตอนอยากเปลี่ยนใจไม่ผูก standard กับ training นี้แล้ว
  const handleDeleteStandard = async () => {
    if (!form.standardId) return;
    if (!window.confirm("ยืนยันลบ training standard นี้?")) return;
    try {
      await axios.delete(
        `${backendUrl}/api/global-trainings/${form.id}/standards/${form.standardId}`,
        { withCredentials: true },
      );
      setForm((f) => ({
        ...f,
        standardId: null,
        source: "PUBLIC",
        clientId: "",
        trainingHours: "",
        validityYears: "",
        isNoExpiry: false,
      }));
      loadTrainings();
      setDetailMsg({ type: "ok", text: "ลบ standard แล้ว" });
    } catch (err) {
      setDetailMsg({
        type: "err",
        text:
          err.response?.data?.message ||
          "ลบไม่สำเร็จ — standard นี้อาจถูกใช้งานอยู่ในบาง contract",
      });
    }
  };

  // ลบ GlobalTraining ทั้งตัว — guard ถ้ายังมี standard ผูกอยู่
  const handleDeleteTraining = async () => {
    if (form.standardId) {
      setDetailMsg({
        type: "err",
        text: "ลบไม่ได้ — มี training standard ผูกอยู่ กรุณาลบ standard ก่อน",
      });
      return;
    }
    if (!window.confirm(`ยืนยันลบ training "${form.name}" ?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/global-trainings/${form.id}`, {
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

  // ----- shared styles -----
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
              จัดการ training กลาง (ชั่วโมงอบรม/อายุ cert/source) — 1 training
              ต่อ 1 standard
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
                        padding: "10px 20px",
                        fontSize: "11px",
                        color: "#6c757d",
                        width: "80px",
                        textAlign: "right",
                        whiteSpace: "nowrap", // ← เพิ่มบรรทัดนี้
                      }}
                    >
                      SET UP?
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
                      <td style={{ padding: "10px 20px", textAlign: "right" }}>
                        {(t._count?.trainingStandards ?? 0) > 0 ? (
                          <span style={{ color: "#198754", fontWeight: 600 }}>
                            ✓
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#dc3545",
                              fontWeight: 600,
                              fontSize: "11px",
                            }}
                            title="ยังไม่ตั้งค่า standard"
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ---------- EDIT PANEL (Training + Standard รวมเป็นฟอร์มเดียว) ---------- */}
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
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="เช่น Basic Rigging"
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={labelStyle}>FULL NAME (สำหรับแสดงผล)</label>
                      <input
                        style={inputStyle}
                        value={form.fullName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                        placeholder="ชื่อเต็มจาก Excel (ถ้ามี)"
                      />
                    </div>
                    <div style={{ marginBottom: "18px" }}>
                      <label style={labelStyle}>DESCRIPTION</label>
                      <textarea
                        style={{
                          ...inputStyle,
                          minHeight: "60px",
                          resize: "vertical",
                        }}
                        value={form.description}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* --- Standard fields — โชว์เลยไม่ต้องกด Edit --- */}
                    <div
                      style={{
                        borderTop: "1px solid #f1f3f5",
                        paddingTop: "16px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "13px" }}>
                          Training Standard
                        </span>
                        {form.standardId && (
                          <button
                            style={{ ...btnDanger, padding: "4px 10px" }}
                            onClick={handleDeleteStandard}
                          >
                            Remove Standard
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <label style={labelStyle}>SOURCE</label>
                        <select
                          style={inputStyle}
                          value={form.source}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              source: e.target.value,
                              clientId:
                                e.target.value === "COMPANY" ? f.clientId : "",
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

                      {form.source === "COMPANY" && (
                        <div style={{ marginBottom: "12px" }}>
                          <label style={labelStyle}>CLIENT *</label>
                          <select
                            style={inputStyle}
                            value={form.clientId}
                            onChange={(e) =>
                              setForm((f) => ({
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
                            value={form.trainingHours}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                trainingHours: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>VALIDITY (YEARS)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            disabled={form.isNoExpiry}
                            style={{
                              ...inputStyle,
                              background: form.isNoExpiry ? "#f1f3f5" : "#fff",
                            }}
                            value={form.validityYears}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                validityYears: e.target.value,
                              }))
                            }
                            placeholder="เช่น 3 หรือ 0.5 (=6 เดือน)"
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
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.isNoExpiry}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              isNoExpiry: e.target.checked,
                              validityYears: e.target.checked
                                ? ""
                                : f.validityYears,
                            }))
                          }
                        />
                        No expiry (cert ไม่มีวันหมดอายุ)
                      </label>
                    </div>

                    {/* --- Actions --- */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <button
                        style={btnPrimary}
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
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
