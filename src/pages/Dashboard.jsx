import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [applications, setApplications] = useState([]);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
  saved: 0,
  applied: 0
});
useEffect(() => {

  fetch("http://localhost:5000/api/dashboard-stats/1")
    .then((res) => res.json())
    .then((data) => {
      setStats(data);
    })
    .catch((err) => console.log(err));

}, []);

fetch("http://localhost:5000/api/recent-applications")
  .then((res) => res.json())
  .then((data) => {
    setApplications(data);
  })
  .catch((err) => console.log(err));

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-10 rounded-3xl shadow-2xl">

        <h1 className="text-5xl font-bold">
          Welcome Back 👋
        </h1>

        <button
  onClick={() => {
    localStorage.removeItem("token");
    navigate("/login");
  }}
  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
>
  Logout
</button>

        <p className="mt-4 text-blue-100 text-lg">
          Track your applications and saved jobs
        </p>

      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mt-10">

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-4xl font-bold text-blue-600">
            {stats.applied}
          </h2>

          <p className="text-gray-500 mt-2">
            Applied Jobs
          </p>
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
          <h2 className="text-4xl font-bold text-green-500">
            3
          </h2>

          <p className="text-gray-500 mt-2">
            Interviews
          </p>
        </div>

        {/* Recent Applications */}
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

        <div>

          <h3 className="text-xl font-semibold">
            {app.title}
          </h3>

          <p className="text-gray-500">
            {app.company}
          </p>

        </div>

        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
          {app.status || "Applied"}
        </span>

      </div>

    ))}

  </div>

</div>

      </div>

    </div>
  );
}

export default Dashboard;