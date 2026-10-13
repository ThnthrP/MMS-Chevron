import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContent } from "../../context/AppContext";
import {
  AuthCard,
  PasswordInput,
  AUTH_INPUT,
  AUTH_BTN,
} from "../../components/auth/AuthCard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { backendUrl, setIsLoggedin, getUserData } = useContext(AppContent);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    try {
      setLoading(true);
      // คงไว้ตามเดิม — ส่วนอื่นของระบบ (เช่น getUserData) อาจพึ่งค่านี้อยู่
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(
        `${backendUrl}/api/auth/login`,
        { email: cleanEmail, password },
        { withCredentials: true },
      );

      if (!data.success) {
        toast.error(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      setIsLoggedin(true);
      const user = await getUserData();
      if (!user) {
        toast.error(
          "เข้าสู่ระบบแล้ว แต่โหลดข้อมูลผู้ใช้ไม่สำเร็จ — ลองรีเฟรชหน้า",
        );
        return;
      }
      navigate("/");
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
    <AuthCard title="เข้าสู่ระบบ" subtitle="กรุณาเข้าสู่ระบบเพื่อใช้งาน">
      <form onSubmit={onSubmitHandler} className="space-y-4" noValidate>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          name="email"
          placeholder="อีเมล"
          autoComplete="username"
          autoFocus
          required
          className={AUTH_INPUT}
        />

        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          name="password"
          placeholder="รหัสผ่าน"
          autoComplete="current-password"
          required
        />

        <div className="text-right">
          <Link
            to="/reset-password"
            className="text-sm text-blue-600 no-underline hover:underline"
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className={AUTH_BTN}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
