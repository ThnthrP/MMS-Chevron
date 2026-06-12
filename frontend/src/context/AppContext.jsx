import { createContext, useState, useEffect } from "react";
import axios from "axios";
// import { toast } from "react-toastify";

export const AppContent = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isLoggedin, setIsLoggedin] = useState(false);
  // const [userData, setUserData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/auth/is-auth", {
        withCredentials: true,
      });

      if (data.success) {
        const user = await getUserData();

        if (user) {
          setIsLoggedin(true);
        } else {
          setIsLoggedin(false);
        }
      } else {
        setIsLoggedin(false);
      }
    } catch {
      setIsLoggedin(false);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const getUserData = async () => {
  //   try {
  //     const { data } = await axios.get(backendUrl + "/api/user/data", {
  //       withCredentials: true,
  //     });

  //     if (data.success) {
  //       setUserData(data.userData);
  //       return data.userData;
  //     }

  //     return null;
  //   } catch {
  //     return null; // ห้าม toast ตรงนี้ (มันจะ spam ตอน refresh)
  //   }
  // };

  const getUserData = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/user/data",
        { withCredentials: true }, // 🔥 เพิ่มตรงนี้
      );

      if (data.success) {
        setUserData(data.userData);
        return data.userData;
      }

      return null;
    } catch (err) {
      console.log("GET USER ERROR:", err);
      return null;
    }
  };

  const value = {
    backendUrl,
    isLoggedin,
    setIsLoggedin,
    userData,
    setUserData,
    getUserData,
    loading,
  };

  return (
    <AppContent.Provider value={value}>{props.children}</AppContent.Provider>
  );
};
