import React, { useEffect, useState } from "react";

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
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center justify-between"
          >

            <div>

              <h2 className="text-2xl font-bold">
                {app.title}
              </h2>

              <p className="text-gray-500">
                {app.company}
              </p>

            </div>

            <select
              value={app.status || "Applied"}
              onChange={(e) =>
                updateStatus(app.id, e.target.value)
              }
              className="border p-3 rounded-xl"
            >

              <option>Applied</option>
              <option>Reviewing</option>
              <option>Interview Scheduled</option>
              <option>Rejected</option>
              <option>Hired</option>

            </select>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AdminApplications;