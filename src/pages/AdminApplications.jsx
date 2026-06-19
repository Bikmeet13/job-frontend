import React, { useEffect, useState } from "react";
import axios from "axios";

function AdminApplications() {

  const [applications, setApplications] = useState([]);

  useEffect(() => {

    fetch("http://localhost:5000/api/recent-applications")
      .then((res) => res.json())
      .then((data) => {
        setApplications(data);
      })
      .catch((err) => console.log(err));

  }, []);

  const updateStatus = async (id, status) => {

    await fetch(
      `http://localhost:5000/api/applications/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      }
    );

    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status }
          : app
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-5xl font-bold mb-10">
        Admin Applications
      </h1>

      <div className="space-y-6">

        {applications.map((app) => (
  <div
  key={app.id}
  className="bg-white p-6 rounded-2xl shadow-lg"
>
    <h3>{app.name}</h3>
    <p>{app.email}</p>

    <select
  value={app.status || "Applied"}
  onChange={(e) =>
    updateStatus(app.id, e.target.value)
  }
  className="border p-2 rounded"
>
  <option value="Applied">Applied</option>
  <option value="Under Review">Under Review</option>
  <option value="Shortlisted">Shortlisted</option>
  <option value="Interview Scheduled">Interview Scheduled</option>
  <option value="Interview Completed">Interview Completed</option>
  <option value="Selected">Selected</option>
  <option value="Rejected">Rejected</option>
</select>
<span
  className={`inline-block mt-3 px-3 py-1 rounded-full text-white text-sm
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

  </div>
))}

      </div>

    </div>
  );
}

export default AdminApplications;