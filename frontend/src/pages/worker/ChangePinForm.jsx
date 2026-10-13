import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { WorkerAppContent } from "../../context/WorkerAppContext";

// อยู่ router เดียวกับ /api/worker/auth/login
const CHANGE_PIN_PATH = "/api/worker/auth/change-pin";

// text-base = 16px กัน iOS auto-zoom · pl-10 pr-10 เผื่อปุ่มลูกตาด้านขวา และให้ตัวเลขยังอยู่กลางช่อง
const PIN_INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-center font-mono text-lg tracking-[6px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function PinInput({ label, value, onChange, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label={label}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className={PIN_INPUT}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          tabIndex={-1}
          aria-label={show ? "ซ่อน PIN" : "แสดง PIN"}
          title={show ? "ซ่อน PIN" : "แสดง PIN"}
          className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

// mode = "forced"   → หน้าเต็มจอ บังคับตั้ง PIN ครั้งแรก (ใช้ PIN จาก HR เป็น PIN เดิม)
// mode = "optional" → ฟอร์มในแท็บ "ของฉัน" เปลี่ยนเองเมื่อไรก็ได้
export default function ChangePinForm({ mode = "optional", onDone }) {
  const { backendUrl } = useContext(WorkerAppContent);
  const forced = mode === "forced";

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ready =
    currentPin.length === 6 && newPin.length === 6 && confirmPin.length === 6;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPin !== confirmPin) {
      setError("PIN ใหม่ทั้ง 2 ช่องไม่ตรงกัน");
      return;
    }

    try {
      setSaving(true);
      const { data } = await axios.post(
        `${backendUrl}${CHANGE_PIN_PATH}`,
        { currentPin, newPin, confirmPin },
        { withCredentials: true },
      );
      if (data.success) {
        toast.success(
          "เปลี่ยน PIN สำเร็จ ใช้ PIN ใหม่ในการเข้าสู่ระบบครั้งถัดไป",
        );
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        onDone?.();
      } else {
        setError(data.message || "เปลี่ยน PIN ไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.status === 404
          ? "ระบบยังไม่รองรับการเปลี่ยน PIN — กรุณาแจ้งเจ้าหน้าที่"
          : err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {forced && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
          เข้าสู่ระบบครั้งแรก กรุณาตั้ง PIN ใหม่ที่จำได้เอง ก่อนเริ่มใช้งาน
        </div>
      )}

      <PinInput
        label={forced ? "PIN ที่ได้รับจาก HR" : "PIN เดิม"}
        value={currentPin}
        onChange={setCurrentPin}
        autoFocus={forced}
      />
      <PinInput
        label="PIN ใหม่ (ตัวเลข 6 หลัก)"
        value={newPin}
        onChange={setNewPin}
      />
      <PinInput
        label="ยืนยัน PIN ใหม่"
        value={confirmPin}
        onChange={setConfirmPin}
      />

      <div className="text-[11px] leading-relaxed text-gray-500">
        ห้ามใช้เลขซ้ำ (111111) เลขเรียง (123456) วันเกิด หรือรหัสพนักงาน
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!ready || saving}
        className="w-full cursor-pointer rounded-lg border-none bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-default disabled:bg-gray-300"
      >
        {saving
          ? "กำลังบันทึก..."
          : forced
            ? "ตั้ง PIN และเริ่มใช้งาน"
            : "เปลี่ยน PIN"}
      </button>

      <div className="text-center text-[11px] text-gray-400">
        ลืม PIN? ติดต่อทีม Manpower / HR เพื่อรีเซ็ต
      </div>
    </form>
  );
}
