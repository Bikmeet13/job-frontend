import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ saved: 0, applied: 0 });

  const navigate = useNavigate();

  useEffect(() => {
  const userId = localStorage.getItem("userId");

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/dashboard-stats/${userId}`
      );

      setStats(res.data);

    } catch (err) {
      console.log("DASHBOARD ERROR:", err);
    }
  };
 // ✅ DEFINE THIS FUNCTION
  const fetchApplications = async () => {
    try {
      const res = await axios.get(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/recent-applications"
      );
      setApplications(res.data);
    } catch (err) {
      console.log("APPLICATION ERROR:", err);
    }
  };
  
  fetchStats();
   fetchApplications(); // ✅ ADD THIS

}, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      {/* ✅ HEADER */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-10 rounded-3xl shadow-2xl">

        <div className="flex justify-between items-center">

          {/* LEFT */}
          <div>
            <h1 className="text-5xl font-bold">
              Welcome Back 👋
            </h1>

            <p className="mt-4 text-blue-100 text-lg">
              Track your applications and saved jobs
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex gap-4">

            <button
              onClick={() => navigate("/")}
              className="bg-white text-blue-800 px-6 py-2 rounded-lg font-semibold"
            >
              Home
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Logout
            </button>

          </div>

        </div>

      </div>

      {/* ✅ STATS */}
      <div className="grid md:grid-cols-3 gap-6 mt-10">

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-4xl font-bold text-blue-600">
            {stats.applied}
          </h2>
          <p className="text-gray-500 mt-2">Applied Jobs</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-4xl font-bold text-red-500">
            {stats.saved}
          </h2>
          <p className="text-gray-500 mt-2">Saved Jobs</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-4xl font-bold text-green-500">3</h2>
          <p className="text-gray-500 mt-2">Interviews</p>
        </div>

      </div>

      {/* ✅ RECENT APPLICATIONS */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mt-10">

        <h2 className="text-3xl font-bold mb-6">
          Recent Applications
        </h2>

        <div className="space-y-4">

          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between border-b pb-4"
            >

            <div className="flex items-center gap-4">
  <div>
    <h3 className="text-xl font-semibold">{app.title}</h3>
    <p className="text-gray-500">{app.company}</p>
  </div>

  <button
    onClick={() => navigate(`/chatbot?applicationId=${app.id}`)}
    className="px-3 py-1 bg-indigo-600 text-white rounded"
  >
    🤖 Start Interview
  </button>
</div>

              <div>
                <h3 className="text-xl font-semibold">{app.title}</h3>
                <p className="text-gray-500">{app.company}</p>
              </div>

              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                {app.status || "Applied"}
              </span>
            </div>
          ))}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;