import React, { useEffect, useState } from "react";
import axios from "axios";

function SavedJobs() {
  const [jobs, setJobs] = useState([]);

 useEffect(() => {
  const userId = localStorage.getItem("userId");

  axios.get(
    `https://humorous-fulfillment-production-1f5e.up.railway.app/api/saved-jobs/${userId}`
  )
    .then((res) => {
      console.log("SAVED JOBS:", res.data);
      setJobs(res.data);
    })
    .catch((err) => console.log(err));
}, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-5xl font-bold mb-10">
        ❤️ Saved Jobs
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {jobs.map((job) => (

          <div
            key={job.id}
            className="bg-white p-6 rounded-2xl shadow-lg"
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
 onClick={() => {
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
  external_job_id: job.job_id,
  source: "google",

  title: job.job_title,
  company: job.employer_name,
  location: job.job_city || "Remote"
})
    }
  )
    .then(() => {
      setJobs(jobs.filter((j) => j.id !== job.id));
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