const ExpertDashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-purple-500 text-white p-4 rounded">Active Jobs</div>
        <div className="bg-indigo-500 text-white p-4 rounded">Engineers</div>
        <div className="bg-pink-500 text-white p-4 rounded">Maintenance</div>
        <div className="bg-gray-700 text-white p-4 rounded">Alerts</div>
      </div>
    </div>
  );
};

export default ExpertDashboard;