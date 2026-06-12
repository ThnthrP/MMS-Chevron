import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { toast } from "react-toastify";

import Layout from "../../components/layout/Layout";

const Profile = () => {
  const { backendUrl, userData, getUserData } = useContext(AppContent);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
  });

  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        department: userData.department || "",
      });
    }
  }, [userData]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { data } = await axios.put(
        `${backendUrl}/api/user/update`,
        {
          name: form.name,
          phone: form.phone,
          department: form.department,
        },
        {
          withCredentials: true,
        },
      );

      if (data.success) {
        toast.success("Profile updated");
        await getUserData();
        setEditingField(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-xl mx-auto bg-white p-5 rounded-xl shadow space-y-4">
          <h1 className="text-2xl font-bold text-center">My Profile</h1>

          <div>
            <span className="text-xs text-gray-500">Role</span>

            <div className="mt-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {userData?.role?.name || "No role"}
              </span>
            </div>
          </div>

          {/* NAME */}
          <div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Role</span>
              <div className="mt-1">
                {/* <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {userData?.role}
              </span> */}
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {userData?.role?.name || "No role"}
                </span>
              </div>
            </div>
            <label className="text-xs text-gray-600">ชื่อ</label>

            {editingField === "name" ? (
              <div className="flex gap-2 mt-1">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="flex-1 border px-3 py-1 rounded text-sm"
                />
                {/* <button onClick={handleSave} className="text-blue-500 text-sm">
                Save
              </button> */}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="text-blue-500 text-sm"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-gray-500 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex justify-between mt-1">
                <span>{form.name}</span>
                <button
                  onClick={() => setEditingField("name")}
                  className="text-blue-500 text-sm"
                >
                  แก้ไข
                </button>
              </div>
            )}
          </div>

          {/* EMAIL (readonly) */}
          <div>
            <label className="text-xs text-gray-600">Email</label>
            <div className="mt-1 text-gray-700">{form.email}</div>
          </div>

          {/* PHONE */}
          <div>
            <label className="text-xs text-gray-600">เบอร์โทร</label>

            {editingField === "phone" ? (
              <div className="flex gap-2 mt-1">
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="flex-1 border px-3 py-1 rounded text-sm"
                />
                {/* <button onClick={handleSave} className="text-blue-500 text-sm">
                บันทึก
              </button> */}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="text-blue-500 text-sm"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-gray-500 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex justify-between mt-1">
                <span>{form.phone || "ยังไม่ได้เพิ่ม"}</span>
                <button
                  onClick={() => setEditingField("phone")}
                  className="text-blue-500 text-sm"
                >
                  {form.phone ? "แก้ไข" : "เพิ่ม"}
                </button>
              </div>
            )}
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="text-xs text-gray-600">แผนก</label>

            {editingField === "department" ? (
              <div className="flex gap-2 mt-1">
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="flex-1 border px-3 py-1 rounded text-sm"
                >
                  <option value="">เลือกแผนก</option>
                  <option>MANPOWER</option>
                  <option>CISS</option>
                  <option>CES</option>
                  <option>QAQC</option>
                  <option>HR</option>
                </select>

                {/* <button onClick={handleSave} className="text-blue-500 text-sm">
                บันทึก
              </button> */}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="text-blue-500 text-sm"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-gray-500 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex justify-between mt-1">
                <span>{form.department || "ยังไม่ได้เลือก"}</span>
                <button
                  onClick={() => setEditingField("department")}
                  className="text-blue-500 text-sm"
                >
                  {form.department ? "แก้ไข" : "เพิ่ม"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
