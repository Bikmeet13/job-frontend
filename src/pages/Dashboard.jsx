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

 // 🔥 fetch job details for each application
    const appsWithJobs = await Promise.all(
      res.data.map(async (app) => {
        const jobId = app.jobId || app.job_id || app.jobid;

         if (!jobId) return app;

         if (isNaN(jobId)) return app;
        try {
          const jobRes = await axios.get(
  `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${jobId}`,
  {
    validateStatus: (status) => status < 500 // 👈 THIS IS THE FIX
  }
);
if (jobRes.status === 404) {
  return null; // skip deleted job
}

          return {
            ...app,
            title: jobRes.data.title,
            company: jobRes.data.company
          };
        } catch (err) {
  if (err.response?.status !== 404) {
    console.log("JOB FETCH ERROR:", err);
  }
  
      return null; // ❌ skip broken job
    }
  })
);

// 🔥 remove null apps
setApplications(appsWithJobs.filter(Boolean));

    } catch (err) {
      console.log("APPLICATION ERROR:", err);
      console.log("APPLICATION DATA:", res.data);
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
          <p className="text-gray-500 mt-2">
  Completed Interviews
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

  return (
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
  onClick={() =>
    navigate(`/chatbot?applicationId=${app.id}&jobId=${jobId}`)
  }
  disabled={isDone}
  className={`px-3 py-1 rounded text-white ${
    isDone
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-indigo-600 hover:bg-indigo-700"
  }`}
>
  {isDone ? "✅ Interview Completed" : "🤖 Start Interview"}
</button>

        <button
  onClick={() => {
    if (window.confirm("Delete this application?")) {
      deleteApplication(app.id);
    }
  }}
  className="px-3 py-1 bg-red-500 text-white rounded"
>
  🗑 Delete
</button>

      </div>

      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
        {app.status || "Applied"}
      </span>

    </div>
  );
})}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;