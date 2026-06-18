import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function SavedJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);

 useEffect(() => {
  const userId = localStorage.getItem("userId");

  axios.get(
    `https://humorous-fulfillment-production-1f5e.up.railway.app/api/saved-jobs/${userId}`
  )
    .then((res) => {
  console.log(
    JSON.stringify(res.data, null, 2)
  );

  setJobs(res.data);
})
    .catch((err) => console.log(err));
}, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
  <h1 className="text-5xl font-bold">
    ❤️ Saved Jobs
  </h1>

  <div className="flex gap-3">
    <button
      onClick={() => navigate("/")}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl"
    >
      🏠 Home
    </button>

    <button
      onClick={() => navigate("/dashboard")}
      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl"
    >
      📊 Dashboard
    </button>
  </div>
</div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {jobs.map((job) => (

          <div
  key={job.id}
  onClick={() =>
    navigate(`/jobs/${job.job_id || job.external_job_id}`, {
      state: { job }
    })
  }
  className="bg-white p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl transition"
>
            <h2 className="text-2xl font-bold">
              {job.title}
            </h2>

            <p className="text-gray-600 mt-2">
              {job.company}
            </p>

            <p className="text-gray-500 mt-1">
              📍 {job.location}
            </p>
<button
 onClick={(e) => {
  e.stopPropagation();
  const userId = localStorage.getItem("userId");

  fetch(
    "https://humorous-fulfillment-production-1f5e.up.railway.app/api/unsave-job",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
  user_id: userId,
  job_id: job.job_id,
  external_job_id: job.external_job_id
})
    }
  )
    .then(() => {
  setJobs((prev) =>
    prev.filter(
      (j) =>
        j.id !== job.id &&
        j.external_job_id !== job.external_job_id
    )
  );
})
    .catch((err) => console.log(err));
}}

  className="mt-5 w-full border border-red-500 text-red-500 py-3 rounded-xl hover:bg-red-50 transition"
>
  ❌ Remove Saved Job
</button>
          </div>

        ))}

      </div>

    </div>
  );
}

export default SavedJobs;