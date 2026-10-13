import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const WorkerAppContent = createContext();

export const WorkerAppContextProvider = (props) => {
  axios.defaults.withCredentials = true;

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isLoggedin, setIsLoggedin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  // true = ยังใช้ PIN ที่ HR ตั้งให้ → WorkerAppRouter แสดงหน้าตั้ง PIN ใหม่แทนแอป
  const [mustChangePin, setMustChangePin] = useState(false);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/worker/auth/is-auth",
        { withCredentials: true },
      );

      if (data.success) {
        setEmployee(data.employee);
        setMustChangePin(!!data.mustChangePin);
        setIsLoggedin(true);
      } else {
        setIsLoggedin(false);
        setEmployee(null);
        setMustChangePin(false);
      }
    } catch {
      setIsLoggedin(false);
      setEmployee(null);
      setMustChangePin(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        backendUrl + "/api/worker/auth/logout",
        {},
        { withCredentials: true },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggedin(false);
      setEmployee(null);
      setMustChangePin(false);
    }
  };

  const refreshPendingCount = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/worker/jobs/pending-confirmation",
        { withCredentials: true },
      );
      if (data.success) {
        setPendingCount(data.candidates.length);
      }
    } catch {
      // เงียบไว้ — ไม่ critical พอจะ toast error
    }
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ยังไม่ตั้ง PIN ใหม่ = ยังไม่เข้าแอป ไม่ต้องโหลดจำนวนงานรอยืนยัน
    if (isLoggedin && !mustChangePin) {
      refreshPendingCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedin, mustChangePin]);

  const value = {
    backendUrl,
    isLoggedin,
    setIsLoggedin,
    employee,
    setEmployee,
    checkAuth,
    logout,
    loading,
    pendingCount,
    refreshPendingCount,
    mustChangePin,
    setMustChangePin,
  };

  return (
    <WorkerAppContent.Provider value={value}>
      {props.children}
    </WorkerAppContent.Provider>
  );
};
