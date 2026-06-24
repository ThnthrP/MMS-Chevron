import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";

// ระดับ requirement ที่ Chevron ใช้จริง (ยืนยัน valid จาก import)
// ถ้า enum มี required/relevant ด้วยและอยากใช้ เพิ่มที่นี่ได้เลย
const REQ_LEVELS = [
  { value: "", label: "— not required", color: "#adb5bd" },
  { value: "mandatory", label: "Mandatory (X)", color: "#dc3545" },
  { value: "assigned", label: "Assigned (O)", color: "#fd7e14" },
];

export default function MatrixEditor() {
  const { backendUrl } = useContext(AppContent);

  const [contracts, setContracts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [contractId, setContractId] = useState("");
  const [positionId, setPositionId] = useState("");

  const [items, setItems] = useState([]); // [{ clientTrainingId, name, alias, requirementType }]
  const [meta, setMeta] = useState(null); // { contract, position }
  const [search, setSearch] = useState("");

  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok"|"err", text }

  // โหลด contracts + positions (reuse endpoint เดิม)
  useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const [cRes, pRes] = await Promise.all([
          axios.get(`${backendUrl}/api/training-matrix/contracts`, {
            withCredentials: true,
          }),
          axios.get(`${backendUrl}/api/positions`, { withCredentials: true }),
        ]);
        setContracts(cRes.data || []);
        setPositions(pRes.data || []);
      } catch (err) {
        console.error(err);
        setMsg({ type: "err", text: "โหลด contract/position ไม่สำเร็จ" });
      } finally {
        setLoadingLists(false);
      }
    })();
  }, [backendUrl]);

  // โหลด matrix เมื่อเลือกครบทั้ง contract + position
  useEffect(() => {
    if (!contractId || !positionId) {
      setItems([]);
      setMeta(null);
      return;
    }
    (async () => {
      try {
        setLoadingMatrix(true);
        setMsg(null);
        const res = await axios.get(
          `${backendUrl}/api/positions/${positionId}/matrix`,
          { params: { contractId }, withCredentials: true },
        );
        setItems(res.data.items || []);
        setMeta({ contract: res.data.contract, position: res.data.position });
      } catch (err) {
        console.error(err);
        setMsg({ type: "err", text: "โหลด matrix ไม่สำเร็จ" });
        setItems([]);
      } finally {
        setLoadingMatrix(false);
      }
    })();
  }, [backendUrl, contractId, positionId]);

  const setLevel = (clientTrainingId, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.clientTrainingId === clientTrainingId
          ? { ...it, requirementType: value || null }
          : it,
      ),
    );
    setMsg(null);
  };

  const requiredCount = items.filter((it) => it.requirementType).length;

  const handleSave = async () => {
    try {
      setSaving(true);
      setMsg(null);
      const payload = {
        contractId,
        items: items
          .filter((it) => it.requirementType)
          .map((it) => ({
            clientTrainingId: it.clientTrainingId,
            requirementType: it.requirementType,
          })),
      };
      const res = await axios.put(
        `${backendUrl}/api/positions/${positionId}/matrix`,
        payload,
        { withCredentials: true },
      );
      setMsg({
        type: "ok",
        text: `บันทึกแล้ว — ${res.data.count} training สำหรับตำแหน่งนี้`,
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err.response?.data?.message || "บันทึก matrix ไม่สำเร็จ",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((it) =>
    it.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selectStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };
  const labelStyle = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6c757d",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div className="container-fluid p-4">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🧩</span>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>
              Matrix Editor
            </span>
            <span style={{ color: "#6c757d", fontSize: "12px" }}>
              กำหนด training ที่ตำแหน่งต้องมี ต่อ contract (M/X/O) — มีผลกับ
              eligibility &amp; gap analysis
            </span>
          </div>
        </div>

        {/* Selectors */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div>
            <label style={labelStyle}>CONTRACT</label>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              disabled={loadingLists}
              style={selectStyle}
            >
              <option value="">— เลือก contract —</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.contractNo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>POSITION</label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              disabled={loadingLists}
              style={selectStyle}
            >
              <option value="">— เลือก position —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message */}
        {msg && (
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
        )}

        {/* Body */}
        {!contractId || !positionId ? (
          <div
            style={{
              background: "#fff",
              border: "1px dashed #dee2e6",
              borderRadius: "10px",
              padding: "48px",
              textAlign: "center",
              color: "#6c757d",
              fontSize: "14px",
            }}
          >
            เลือก <strong>Contract</strong> และ <strong>Position</strong>{" "}
            เพื่อแก้ training matrix
          </div>
        ) : loadingMatrix ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "48px",
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            Loading matrix...
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* Toolbar */}
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
              <div style={{ fontSize: "13px", color: "#495057" }}>
                <strong>{meta?.position?.name}</strong>
                {meta?.contract && (
                  <span style={{ color: "#6c757d" }}>
                    {" "}
                    · {meta.contract.clientName || meta.contract.name} (
                    {meta.contract.contractNo})
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "10px",
                    background: "#e7f1ff",
                    color: "#084298",
                    borderRadius: "6px",
                    padding: "2px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {requiredCount} required
                </span>
              </div>
              <input
                type="text"
                placeholder="ค้นหา training..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "220px",
                  padding: "7px 12px",
                  fontSize: "13px",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </div>

            {items.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: "13px",
                }}
              >
                contract นี้ยังไม่มี ClientTraining — ต้อง seed/import training
                ของ contract ก่อน
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
                        fontWeight: 600,
                      }}
                    >
                      TRAINING
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 20px",
                        fontSize: "11px",
                        color: "#6c757d",
                        fontWeight: 600,
                        width: "200px",
                      }}
                    >
                      REQUIREMENT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan="2"
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          color: "#6c757d",
                        }}
                      >
                        ไม่พบ training ที่ตรงกับ "{search}"
                      </td>
                    </tr>
                  ) : (
                    filtered.map((it) => {
                      const active = !!it.requirementType;
                      return (
                        <tr
                          key={it.clientTrainingId}
                          style={{
                            borderBottom: "1px solid #f8f9fa",
                            background: active ? "#fcfdff" : "#fff",
                          }}
                        >
                          <td style={{ padding: "10px 20px" }}>
                            <span style={{ fontWeight: active ? 600 : 400 }}>
                              {it.name}
                            </span>
                            {it.alias && it.alias !== it.name && (
                              <span
                                style={{
                                  color: "#adb5bd",
                                  fontSize: "11px",
                                  marginLeft: "8px",
                                }}
                              >
                                ({it.alias})
                              </span>
                            )}
                          </td>
                          <td
                            style={{ padding: "10px 20px", textAlign: "right" }}
                          >
                            <select
                              value={it.requirementType || ""}
                              onChange={(e) =>
                                setLevel(it.clientTrainingId, e.target.value)
                              }
                              style={{
                                padding: "5px 10px",
                                fontSize: "12px",
                                fontWeight: 600,
                                border: "1px solid #dee2e6",
                                borderRadius: "6px",
                                background: "#fff",
                                color:
                                  REQ_LEVELS.find(
                                    (l) =>
                                      l.value === (it.requirementType || ""),
                                  )?.color || "#212529",
                                cursor: "pointer",
                              }}
                            >
                              {REQ_LEVELS.map((l) => (
                                <option key={l.value} value={l.value}>
                                  {l.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* Footer / Save */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "12px",
                padding: "14px 20px",
                borderTop: "1px solid #f1f3f5",
              }}
            >
              <span style={{ fontSize: "12px", color: "#6c757d" }}>
                ติ๊ก {requiredCount} จาก {items.length} training
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "#0d6efd",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 22px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Matrix"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
