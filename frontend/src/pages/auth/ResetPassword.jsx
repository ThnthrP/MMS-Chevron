import React, { useContext, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { toast } from "react-toastify";
import logo from "../../assets/experteam_logo.png";

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContent);
  axios.defaults.withCredentials = true;

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpSubmited, setIsOtpSubmited] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef([]);

  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    paste.split("").forEach((char, i) => {
      if (inputRefs.current[i]) {
        inputRefs.current[i].value = char;
      }
    });
  };

  // STEP 1: ส่ง email
  const onSubmitEmail = async (e) => {
    e.preventDefault();

    if (!email.includes("@")) {
      return toast.error("รูปแบบอีเมลไม่ถูกต้อง");
    }

    try {
      setLoading(true);

      const { data } = await axios.post(
        backendUrl + "/api/auth/send-reset-otp",
        { email },
      );

      if (data.success) {
        toast.success(data.message);
        setIsEmailSent(true);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: OTP
  const onSubmitOTP = (e) => {
    e.preventDefault();

    const finalOtp = inputRefs.current.map((i) => i.value).join("");

    if (finalOtp.length !== 6) {
      return toast.error("กรุณากรอก OTP ให้ครบ");
    }

    setOtp(finalOtp);
    setIsOtpSubmited(true);
  };

  // STEP 3: password ใหม่
  const onSubmitNewPassword = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await axios.post(
        backendUrl + "/api/auth/reset-password",
        {
          email,
          otp,
          newPassword,
        },
      );

      if (data.success) {
        toast.success(data.message);
        navigate("/login");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      {/* CARD */}
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-8">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} className="w-14 mb-2" />
          <h1 className="text-xl font-semibold text-gray-800">
            Manpower Management
          </h1>
          <p className="text-sm text-gray-500">System</p>
        </div>

        {/* STEP 1 */}
        {!isEmailSent && (
          <>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
              รีเซ็ตรหัสผ่าน
            </h2>
            <p className="text-center text-sm text-gray-500 mb-6">
              กรุณากรอกอีเมลของคุณ
            </p>

            <form onSubmit={onSubmitEmail} className="space-y-4">
              <input
                type="email"
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <button
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "กำลังส่ง..." : "ส่ง OTP"}
              </button>
            </form>
          </>
        )}

        {/* STEP 2 OTP */}
        {isEmailSent && !isOtpSubmited && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2">กรอก OTP</h2>
            <p className="text-center text-sm text-gray-500 mb-6">
              รหัส 6 หลักถูกส่งไปยังอีเมลของคุณ
            </p>

            <form onSubmit={onSubmitOTP}>
              <div className="flex justify-between mb-6" onPaste={handlePaste}>
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength="1"
                      ref={(el) => (inputRefs.current[i] = el)}
                      onInput={(e) => handleInput(e, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-12 h-12 border border-gray-300 rounded-md text-center text-lg"
                      required
                    />
                  ))}
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                ยืนยัน OTP
              </button>
            </form>
          </>
        )}

        {/* STEP 3 */}
        {isOtpSubmited && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2">
              ตั้งรหัสผ่านใหม่
            </h2>
            <p className="text-center text-sm text-gray-500 mb-6">
              กรุณากรอกรหัสผ่านใหม่
            </p>

            <form onSubmit={onSubmitNewPassword} className="space-y-4">
              <input
                type="password"
                placeholder="รหัสผ่านใหม่"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <button
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </form>
          </>
        )}

        {/* BACK */}
        <p
          onClick={() => navigate("/login")}
          className="text-center text-sm text-blue-600 mt-6 cursor-pointer hover:underline"
        >
          กลับไปเข้าสู่ระบบ
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
