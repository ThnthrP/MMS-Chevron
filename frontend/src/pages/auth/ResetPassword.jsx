import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";
import {
  AuthCard,
  PasswordInput,
  AUTH_INPUT,
  AUTH_BTN,
  AUTH_LINK,
} from "../../components/auth/AuthCard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const MIN_PASSWORD = 8; // เท่ากับหน้า Profile

const STEPS = {
  email: { title: "รีเซ็ตรหัสผ่าน", no: 1 },
  otp: { title: "กรอก OTP", no: 2 },
  password: { title: "ตั้งรหัสผ่านใหม่", no: 3 },
};

const errMsg = (err, fallback) =>
  err.response?.data?.message || fallback || err.message;

// ── จุดบอกขั้นตอน 1 / 2 / 3 ──
function StepDots({ current }) {
  return (
    <div className="mb-5 flex items-center justify-center gap-2" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === current
              ? "w-6 bg-blue-600"
              : n < current
                ? "w-1.5 bg-blue-300"
                : "w-1.5 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// ── ช่อง OTP 6 หลัก: ตัวเลขเท่านั้น, วางทั้งชุดได้, Backspace ย้อนช่อง ──
function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || "");

  const focusAt = (i) =>
    refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))]?.focus();

  const setDigits = (next) => onChange(next.join("").slice(0, OTP_LENGTH));

  const handleChange = (e, i) => {
    const raw = e.target.value.replace(/\D/g, "");
    // ช่องมีค่าอยู่แล้วแล้วพิมพ์เพิ่ม → เอาเฉพาะตัวที่เพิ่งพิมพ์
    const typed =
      digits[i] && raw.length === 2
        ? raw.replace(digits[i], "") || raw[1]
        : raw;
    if (!typed) return;
    const next = [...digits];
    // พิมพ์ทับช่องที่มีค่าอยู่แล้ว หรือ autofill มาหลายตัว
    typed.split("").forEach((ch, k) => {
      if (i + k < OTP_LENGTH) next[i + k] = ch;
    });
    setDigits(next);
    focusAt(i + typed.length);
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        setDigits(next);
      } else if (i > 0) {
        next[i - 1] = "";
        setDigits(next);
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      focusAt(i + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(pasted.length);
  };

  return (
    <div className="mb-6 flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`OTP หลักที่ ${i + 1}`}
          disabled={disabled}
          autoFocus={i === 0}
          className="box-border h-12 w-full min-w-0 max-w-[48px] rounded-md border border-gray-300 text-center text-lg font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
const ResetPassword = () => {
  const { backendUrl } = useContext(AppContent);
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // email → otp → password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // วินาทีก่อนกดส่ง OTP ซ้ำได้

  // นับถอยหลังปุ่ม "ส่ง OTP อีกครั้ง"
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    const { data } = await axios.post(
      `${backendUrl}/api/auth/send-reset-otp`,
      { email: email.trim() },
      { withCredentials: true },
    );
    if (!data.success) throw new Error(data.message || "ส่ง OTP ไม่สำเร็จ");
    toast.success(data.message || "ส่ง OTP ไปที่อีเมลแล้ว");
    setCooldown(RESEND_SECONDS);
  };

  // STEP 1: ส่ง email
  const onSubmitEmail = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    try {
      setLoading(true);
      await sendOtp();
      setOtp("");
      setStep("otp");
    } catch (err) {
      toast.error(errMsg(err, "ส่ง OTP ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (loading || cooldown > 0) return;
    try {
      setLoading(true);
      await sendOtp();
      setOtp("");
    } catch (err) {
      toast.error(errMsg(err, "ส่ง OTP ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: OTP (ตรวจจริงที่ backend ตอนตั้งรหัสผ่านใหม่)
  const onSubmitOTP = (e) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      toast.error("กรุณากรอก OTP ให้ครบ 6 หลัก");
      return;
    }
    setStep("password");
  };

  // STEP 3: password ใหม่
  const onSubmitNewPassword = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (newPassword.length < MIN_PASSWORD) {
      toast.error(`รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${backendUrl}/api/auth/reset-password`,
        { email: email.trim(), otp, newPassword },
        { withCredentials: true },
      );
      if (data.success) {
        toast.success(
          data.message || "ตั้งรหัสผ่านใหม่แล้ว — เข้าสู่ระบบได้เลย",
        );
        navigate("/login");
      } else {
        toast.error(data.message || "ตั้งรหัสผ่านไม่สำเร็จ");
      }
    } catch (err) {
      toast.error(
        errMsg(err, "ตั้งรหัสผ่านไม่สำเร็จ — OTP อาจไม่ถูกต้องหรือหมดอายุ"),
      );
    } finally {
      setLoading(false);
    }
  };

  const tooShort = newPassword && newPassword.length < MIN_PASSWORD;
  const mismatch = confirmPassword && newPassword !== confirmPassword;

  const subtitle =
    step === "email" ? (
      "กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งรหัส OTP ไปให้"
    ) : step === "otp" ? (
      <>
        รหัส 6 หลักถูกส่งไปที่{" "}
        <span className="font-semibold text-gray-700">{email.trim()}</span>
      </>
    ) : (
      `ตั้งรหัสผ่านใหม่ อย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
    );

  return (
    <AuthCard
      title={STEPS[step].title}
      subtitle={subtitle}
      footer={
        <button
          type="button"
          onClick={() => navigate("/login")}
          className={AUTH_LINK}
        >
          กลับไปเข้าสู่ระบบ
        </button>
      }
    >
      <StepDots current={STEPS[step].no} />

      {/* STEP 1 */}
      {step === "email" && (
        <form onSubmit={onSubmitEmail} className="space-y-4" noValidate>
          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            className={AUTH_INPUT}
          />
          <button
            type="submit"
            disabled={loading || !email}
            className={AUTH_BTN}
          >
            {loading ? "กำลังส่ง..." : "ส่ง OTP"}
          </button>
        </form>
      )}

      {/* STEP 2 */}
      {step === "otp" && (
        <form onSubmit={onSubmitOTP}>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />

          <button
            type="submit"
            disabled={otp.length !== OTP_LENGTH}
            className={AUTH_BTN}
          >
            ยืนยัน OTP
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep("email")}
              className={AUTH_LINK}
            >
              ← เปลี่ยนอีเมล
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={loading || cooldown > 0}
              className={AUTH_LINK}
            >
              {cooldown > 0
                ? `ส่ง OTP อีกครั้งได้ใน ${cooldown} วิ`
                : loading
                  ? "กำลังส่ง..."
                  : "ส่ง OTP อีกครั้ง"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3 */}
      {step === "password" && (
        <form onSubmit={onSubmitNewPassword} className="space-y-4" noValidate>
          <PasswordInput
            placeholder="รหัสผ่านใหม่"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            required
          />
          <PasswordInput
            placeholder="ยืนยันรหัสผ่านใหม่"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {(tooShort || mismatch) && (
            <div className="text-xs font-semibold text-red-600">
              {tooShort
                ? `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
                : "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน"}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className={AUTH_BTN}
          >
            {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("otp")}
              className={AUTH_LINK}
            >
              ← แก้ไข OTP
            </button>
          </div>
        </form>
      )}
    </AuthCard>
  );
};

export default ResetPassword;
