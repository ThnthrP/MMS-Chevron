import React, { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import axios from "axios";
import { toast } from "react-toastify";
import experteamLogo from "../../assets/experteam_logo.png";
import { Eye, EyeOff } from "lucide-react";

const PIN_LENGTH = 6;

// text-base = 16px กัน iOS auto-zoom ตอน focus input บนมือถือ
const INPUT =
  "box-border w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-base outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const WorkerLogin = () => {
  const navigate = useNavigate();
  const {
    backendUrl,
    checkAuth,
    isLoggedin,
    loading: checkingSession,
  } = useContext(WorkerAppContent);

  const [empId, setEmpId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── login ค้างอยู่แล้ว → พากลับหน้าแรก ไม่ให้ login ซ้อน ──
  // รอเช็ค session ให้เสร็จก่อน ไม่อย่างนั้นฟอร์มจะกะพริบแวบหนึ่งก่อน redirect
  if (checkingSession) {
    return <div className="min-h-screen bg-gray-100" />;
  }
  if (isLoggedin) {
    return <Navigate to="/worker" replace />;
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmpId = empId.trim();
    if (!cleanEmpId || !pin) {
      toast.error("กรุณากรอกรหัสพนักงานและ PIN");
      return;
    }
    if (pin.length !== PIN_LENGTH) {
      toast.error(`PIN ต้องมี ${PIN_LENGTH} หลัก`);
      return;
    }

    try {
      setLoading(true);
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(
        `${backendUrl}/api/worker/auth/login`,
        { empId: cleanEmpId, pin },
        { withCredentials: true },
      );

      if (!data.success) {
        toast.error(data.message || "รหัสพนักงานหรือ PIN ไม่ถูกต้อง");
        return;
      }

      toast.success(data.message || "เข้าสู่ระบบสำเร็จ");
      await checkAuth(); // sync WorkerAppContext ทันที ไม่ต้อง reload

      // replace = กด back แล้วไม่ย้อนกลับมาหน้า login
      navigate("/worker", { replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "เข้าสู่ระบบไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <img src={experteamLogo} alt="Experteam" className="mb-2 w-14" />
          <div className="text-xl font-semibold text-gray-800">
            Experteam Worker
          </div>
          <div className="text-sm text-gray-500">สำหรับพนักงานภาคสนาม</div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          เข้าสู่ระบบ
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          กรอก Employee ID และ PIN {PIN_LENGTH} หลัก
        </p>

        <form onSubmit={onSubmitHandler} className="space-y-4" noValidate>
          <input
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            type="text"
            inputMode="numeric"
            autoComplete="username"
            autoFocus
            placeholder="Employee ID"
            aria-label="Employee ID"
            className={INPUT}
            required
          />

          <div className="relative">
            <input
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))
              }
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              autoComplete="current-password"
              placeholder={`PIN ${PIN_LENGTH} หลัก`}
              aria-label="PIN"
              className={`${INPUT} pr-10 tracking-widest`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPin((prev) => !prev)}
              tabIndex={-1}
              aria-label={showPin ? "ซ่อน PIN" : "แสดง PIN"}
              title={showPin ? "ซ่อน PIN" : "แสดง PIN"}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-gray-400 hover:text-gray-600"
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !empId.trim() || pin.length !== PIN_LENGTH}
            className="w-full cursor-pointer rounded-md border-none bg-blue-600 py-2.5 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-400">
          ลืม PIN หรือเข้าไม่ได้? กรุณาติดต่อทีม Manpower / HR
        </div>
      </div>
    </div>
  );
};

export default WorkerLogin;
