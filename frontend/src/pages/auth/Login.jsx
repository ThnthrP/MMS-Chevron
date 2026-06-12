import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import experteamLogo from "../../assets/experteam_logo.png";

const Login = () => {
  const navigate = useNavigate();

  const { backendUrl, setIsLoggedin, getUserData } = useContext(AppContent);

  const [state, setState] = useState("Login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return toast.error("Invalid email format");
      }

      setLoading(true);

      axios.defaults.withCredentials = true;

      let data;

      // =====================================================
      // SIGN UP
      // =====================================================

      if (state === "Sign Up") {
        const registerRes = await axios.post(
          backendUrl + "/api/auth/register",
          {
            name,
            email,
            password,
          },
        );

        data = registerRes.data;

        if (data.success) {
          const loginRes = await axios.post(backendUrl + "/api/auth/login", {
            email,
            password,
          });

          data = loginRes.data;
        }
      }

      // =====================================================
      // LOGIN
      // =====================================================
      else {
        const loginRes = await axios.post(backendUrl + "/api/auth/login", {
          email,
          password,
        });

        data = loginRes.data;
      }

      if (!data.success) {
        return toast.error(data.message);
      }

      setIsLoggedin(true);

      const user = await getUserData();

      if (!user) {
        return toast.error("Cannot fetch user data");
      }

      navigate("/admin");
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      {" "}
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-8">
        {" "}
        <div className="flex flex-col items-center mb-6">
          {" "}
          <img src={experteamLogo} alt="logo" className="w-14 mb-2" />
          <h1 className="text-xl font-semibold text-gray-800">
            Manpower Management{" "}
          </h1>
          <p className="text-sm text-gray-500">System</p>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {state === "Sign Up" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {state === "Sign Up"
            ? "กรอกข้อมูลเพื่อสมัครใช้งาน"
            : "กรุณาเข้าสู่ระบบเพื่อใช้งาน"}
        </p>
        <form onSubmit={onSubmitHandler} className="space-y-4">
          {state === "Sign Up" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="ชื่อ-นามสกุล"
              className="w-full border border-gray-300 rounded-md px-4 py-2"
              required
            />
          )}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="อีเมล"
            className="w-full border border-gray-300 rounded-md px-4 py-2"
            required
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="รหัสผ่าน"
            className="w-full border border-gray-300 rounded-md px-4 py-2"
            required
          />

          <div className="text-right">
            <span
              onClick={() => navigate("/reset-password")}
              className="text-sm text-blue-500 cursor-pointer hover:underline"
            >
              ลืมรหัสผ่าน?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : state === "Sign Up"
                ? "สมัครสมาชิก"
                : "เข้าสู่ระบบ"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          {state === "Sign Up" ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <span
            onClick={() => {
              setState(state === "Sign Up" ? "Login" : "Sign Up");

              setName("");
              setEmail("");
              setPassword("");
            }}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            {state === "Sign Up" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
