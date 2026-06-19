import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ saved: 0, applied: 0 });

  const navigate = useNavigate();
  
  const deleteApplication = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // update UI
      setApplications(prev => prev.filter(app => app.id !== id));

      toast.success("Application deleted ✅");

    } catch (err) {
      console.log(err);

       toast.error("Failed to delete ❌");
    }
  };

  const interviewCount = applications.filter(app => {
  const jobId = app.jobId || app.job_id || app.jobid;
  return localStorage.getItem(`done_${jobId}`) === "true";
}).length;

  useEffect(() => {
  const userId = localStorage.getItem("userId");

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");

const res = await axios.get(
  `https://humorous-fulfillment-production-1f5e.up.railway.app/api/dashboard-stats/${userId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);
      setStats(res.data);
    } catch (err) {
      console.log("DASHBOARD ERROR:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");

if (!token) return;

const res = await axios.get(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications",
  {
    headers: {
  Authorization: `Bearer ${token}`
}
  }
);

  
// 🔥 remove null apps
setApplications(res.data);

    } catch (err) {
      console.log("APPLICATION ERROR:", err);
          }
  };

  // ✅ CALL BOTH ONCE
  fetchStats();
  fetchApplications();

  

}, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      {/* ✅ HEADER */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-10 rounded-3xl shadow-2xl">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          {/* LEFT */}
          <div>
            <h1 className="text-5xl font-bold">
              Welcome Back 👋
            </h1>

            <p className="mt-4 text-blue-100 text-lg">
              Track your applications and saved jobs
            </p>
          </div>

          <button
  onClick={() => navigate("/saved-jobs")}
  className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-xl font-semibold whitespace-nowrap"
>
  ❤️ Saved Jobs
</button>

          {/* RIGHT */}
          <div className="flex flex-wrap justify-center gap-2">

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
          <p className="text-gray-500 mt-2">
  Saved Jobs
</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-4xl font-bold text-green-500">{interviewCount}</h2>
          <p className="text-gray-500 mt-2">Interviews</p>
        </div>

      </div>

      {/* ✅ RECENT APPLICATIONS */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mt-10">

        <h2 className="text-3xl font-bold mb-6">
          Recent Applications
        </h2>

        <div className="space-y-4">

          {applications.map((app) => {
  const jobId = app.jobId || app.job_id || app.jobid;
  const isDone = Boolean(localStorage.getItem(`done_${jobId}`));

  const progressWidth =
  app.status === "Applied"
    ? "15%"
    : app.status === "Under Review"
    ? "30%"
    : app.status === "Shortlisted"
    ? "50%"
    : app.status === "Interview Scheduled"
    ? "70%"
    : app.status === "Interview Completed"
    ? "85%"
    : app.status === "Selected"
    ? "100%"
    : "0%";

  return (
    <div
  key={app.id}
  className="border-b pb-6"
>

      <div className="flex flex-col gap-4 w-full">
        <div>
          <h3 className="text-xl font-semibold">{app.title}</h3>
          <p className="text-gray-500">{app.company}</p>
          <div className="mt-4 w-full">

  <span
    className={`inline-block px-4 py-2 rounded-full text-white text-sm font-semibold
      ${
        app.status === "Applied"
          ? "bg-blue-500"
          : app.status === "Under Review"
          ? "bg-yellow-500"
          : app.status === "Shortlisted"
          ? "bg-purple-500"
          : app.status === "Interview Scheduled"
          ? "bg-indigo-500"
          : app.status === "Interview Completed"
          ? "bg-green-500"
          : app.status === "Selected"
          ? "bg-emerald-600"
          : "bg-red-500"
      }
    `}
  >
    {app.status || "Applied"}
  </span>

  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
    <div
  className="bg-green-500 h-3 rounded-full transition-all duration-500"
  style={{ width: progressWidth }}
/>
  </div>

</div>
          <div className="mt-3 text-sm">

  <p>
    {["Applied","Under Review","Shortlisted","Interview Scheduled","Interview Completed","Selected"]
      .indexOf(app.status) >= 0
      ? "✅"
      : "⚪"} Applied
  </p>

  <p>
    {["Under Review","Shortlisted","Interview Scheduled","Interview Completed","Selected"]
      .indexOf(app.status) >= 0
      ? "✅"
      : "⚪"} Under Review
  </p>

  <p>
    {["Shortlisted","Interview Scheduled","Interview Completed","Selected"]
      .indexOf(app.status) >= 0
      ? "✅"
      : "⚪"} Shortlisted
  </p>

  <p>
    {["Interview Scheduled","Interview Completed","Selected"]
      .indexOf(app.status) >= 0
      ? "✅"
      : "⚪"} Interview Scheduled
  </p>

</div>
        </div>

        <div className="flex gap-3 mt-5 flex-wrap">

  <button
    onClick={() =>
      navigate(`/chatbot?applicationId=${app.id}&jobId=${jobId}`)
    }
    disabled={isDone}
    className={`px-4 py-2 rounded-lg text-white font-medium ${
      isDone
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-indigo-600 hover:bg-indigo-700"
    }`}
  >
    {isDone
      ? "✅ Interview Completed"
      : "🤖 Start Interview"}
  </button>

  <button
    onClick={() => {
      if (window.confirm("Delete this application?")) {
        deleteApplication(app.id);
      }
    }}
    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
  >
    🗑 Delete
  </button>

</div>

      </div>

      

    </div>
  );
})}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;