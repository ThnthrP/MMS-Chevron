import React from "react";

const PeDashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">PE Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-purple-500 text-white p-4 rounded">Active Jobs</div>

        <div className="bg-indigo-500 text-white p-4 rounded">
          Assigned Engineers
        </div>

        <div className="bg-pink-500 text-white p-4 rounded">
          Maintenance Tasks
        </div>

        <div className="bg-gray-700 text-white p-4 rounded">Alerts</div>
      </div>

      {/* 🔧 future section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Recent Logs</h2>
        <div className="bg-white shadow p-4 rounded text-sm text-gray-600">
          No logs available
        </div>
      </div>
    </div>
  );
};

export default PeDashboard;
