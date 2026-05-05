import ApplyForm from "../components/ApplyForm";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function JobDetails() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    axios
      .get(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs`
      )
      .then((res) => {
        const foundJob = res.data.find(
          (j) => j.id === Number(id)
        );

        setJob(foundJob);
      })
      .catch((err) => console.log(err));
  }, [id]);

  if (!job) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl font-bold">
          Loading job...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-10">

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-800">
          {job.title}
        </h1>

        {/* Company */}
        <p className="text-2xl text-blue-600 mt-4">
          {job.company}
        </p>

        {/* Location */}
        <p className="text-gray-500 mt-2">
          📍 {job.location}
        </p>
        <div className="mt-6 space-y-3">

  <p className="text-lg">
    💰 <b>Salary:</b> {job.salary}
  </p>

  <p className="text-lg">
    🧠 <b>Experience:</b> {job.experience}
  </p>

  <p className="text-lg">
    🛠️ <b>Skills:</b> {job.skills}
  </p>

  <p className="text-lg">
    💼 <b>Type:</b> {job.type}
  </p>

  <p className="text-lg">
    🌍 <b>Mode:</b> {job.mode}
  </p>

</div>

        {/* Tags */}
        <div className="flex gap-3 mt-6">

          <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm">
            Full-time
          </span>

          <span className="bg-cyan-100 text-cyan-700 px-4 py-2 rounded-full text-sm">
            Remote
          </span>

        </div>

        {/* Description */}
        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-4">
            Job Description
          </h2>

          <p className="text-gray-700 leading-8">
            We are looking for a talented developer to join our growing team.
            You will work on exciting real-world projects and collaborate
            with modern technologies.
          </p>

        </div>

        {/* Apply Button */}
        <button
        
  onClick={() => setShowForm(!showForm)}
  className="mt-10 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition"
>
  Apply Now
</button>
{showForm && (
  <div className="mt-8">
    <ApplyForm jobId={job.id} />
  </div>
)}

      </div>

    </div>
  );
}

export default JobDetails;