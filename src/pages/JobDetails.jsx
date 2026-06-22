import ApplyForm from "../components/ApplyForm";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

function JobDetails() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const applyFormRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
const externalJob = location.state?.job;

  useEffect(() => {
  axios
    .get(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs"
    )
    .then((res) => {
      const internalJobs = res.data;

      const externalJobs =
        JSON.parse(localStorage.getItem("externalJobs")) || [];

      const allJobs = [
        ...internalJobs,
        ...externalJobs,
      ];

      console.log("URL ID:", id);
      console.log("All Jobs:", allJobs);

      const foundJob = allJobs.find(
        (j) => String(j.id) === String(id)
      );

      console.log("Found Job:", foundJob);

      setJob(foundJob);
    })
    .catch((err) => console.log(err));
}, [id]);

  if (!job) {
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-2xl font-bold">
        Job not found 😔
      </p>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <button
  onClick={() => navigate(-1)}
  className="mb-6 px-5 py-3 rounded-xl font-medium transition-all duration-300
             bg-blue-600 text-white hover:bg-blue-700 hover:scale-105
             hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
  ← Back to Jobs
</button>

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
        {job?.source === "google" ? (
  <button
  onClick={() => {
    window.open(
      job.applyLink,
      "_blank",
      "width=1200,height=800,left=100,top=50,resizable=yes,scrollbars=yes"
    );
  }}
  className="mt-8 inline-flex items-center justify-center
             bg-green-600 hover:bg-green-700
             text-white px-8 py-3 rounded-xl
             font-semibold transition-all duration-300
             hover:scale-105 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]"
>
  Apply on Company Website 🚀
</button>

) : (
  <button
    onClick={() => setShowForm(true)}
    className="mt-8 bg-blue-600 hover:bg-blue-700
               text-white px-8 py-3 rounded-xl
               transition-all duration-300 hover:scale-105"
  >
    Apply Now 🚀
  </button>
)}

{showForm && (
  <div ref={applyFormRef} className="mt-10">
    <ApplyForm job={job} />
  </div>
)}

      </div>

    </div>
  );
}

export default JobDetails;