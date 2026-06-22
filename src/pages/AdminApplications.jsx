import React, { useEffect, useState } from "react";
import axios from "axios";

function AdminApplications() {

  const [applications, setApplications] = useState([]);

useEffect(() => {
  axios
    .get(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/recent-applications"
    )
    .then((res) => {
      console.log("ADMIN APPS:", res.data);
      setApplications(res.data);
    })
    .catch(console.log);
}, []);

const updateStatus = async (id, status) => {
  try {
    await axios.put(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`,
      { status }
    );

    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status }
          : app
      )
    );
  } catch (err) {
    console.log(err);
  }
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
  <h3 className="text-xl font-bold">{app.name}</h3>

  <p className="text-gray-600">
    {app.title}
  </p>

  <p className="text-gray-500">
    {app.company}
  </p>

  <select
    value={app.status || "Pending"}
    onChange={(e) =>
      updateStatus(app.id, e.target.value)
    }
    className="border p-2 rounded mt-3"
  >
    <option value="Pending">Pending</option>
    <option value="Applied">Applied</option>
    <option value="Under Review">Under Review</option>
    <option value="Shortlisted">Shortlisted</option>
    <option value="Interview Scheduled">Interview Scheduled</option>
    <option value="Interview Completed">Interview Completed</option>
    <option value="Selected">Selected</option>
    <option value="Rejected">Rejected</option>
  </select>

  <span
    className="inline-block mt-3 px-3 py-1 rounded-full bg-red-500 text-white text-sm"
  >
    {app.status || "Pending"}
  </span>
</div>
))}

      </div>

    </div>
  );
}

export default AdminApplications;