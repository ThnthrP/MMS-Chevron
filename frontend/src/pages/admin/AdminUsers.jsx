import { useEffect, useState } from "react";
import axios from "axios";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [roleList, setRoleList] = useState([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // โหลด users + roles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, roleRes] = await Promise.all([
          axios.get(backendUrl + "/api/user/all", { withCredentials: true }),
          axios.get(backendUrl + "/api/user/roles", { withCredentials: true }),
        ]);

        if (userRes.data.success) {
          setUsers(userRes.data.users);

          const initialRoles = {};
          userRes.data.users.forEach((u) => {
            initialRoles[u.id] = u.role?.id;
          });
          setRoles(initialRoles);
        }

        if (roleRes.data.success) {
          setRoleList(roleRes.data.roles);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadData();
  }, []);

  // เปลี่ยน role
  const handleChange = (userId, roleId) => {
    setRoles((prev) => ({
      ...prev,
      [userId]: roleId,
    }));
  };

  // save role อย่างเดียว
  const handleSave = async (userId) => {
    try {
      const roleId = roles[userId];

      const res = await axios.put(
        backendUrl + "/api/user/role",
        { userId, roleId },
        { withCredentials: true },
      );

      if (res.data.success) {
        alert("Updated successfully");

        // reload users
        const userRes = await axios.get(backendUrl + "/api/user/all", {
          withCredentials: true,
        });

        if (userRes.data.success) {
          setUsers(userRes.data.users);

          const updatedRoles = {};
          userRes.data.users.forEach((u) => {
            updatedRoles[u.id] = u.role?.id;
          });

          setRoles(updatedRoles);
        }
      } else {
        alert("Update failed");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">User Management</h1>

      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Company</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.name}</td>
              <td>{u.email}</td>

              {/* Role dropdown */}
              <td>
                <select
                  value={roles[u.id] || ""}
                  onChange={(e) => handleChange(u.id, e.target.value)}
                  className="border p-1 rounded"
                >
                  {roleList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* 🔥 Company (read-only) */}
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold
                    ${
                      u.company?.name === "CES"
                        ? "bg-blue-100 text-blue-700"
                        : u.company?.name === "EXPERTEAM"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-500"
                    }
                  `}
                >
                  {u.company?.name || "No Company"}
                </span>
              </td>

              {/* Save */}
              <td>
                <button
                  onClick={() => handleSave(u.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsers;
