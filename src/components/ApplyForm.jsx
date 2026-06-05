import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { API } from "../services/api";
import React, { useState, useEffect } from "react";
import axios from "axios";

function ApplyForm() {
  const { id } = useParams();
const jobId = id;
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [job, setJob] = useState(null);

  console.log("JOB ID RECEIVED:", jobId);

useEffect(() => {
  const fetchJob = async () => {
    try {
      const res = await axios.get(
        `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${jobId}`
      );
      setJob(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  fetchJob();
}, [jobId]);
  
  
 useEffect(() => {
  const name = localStorage.getItem("username");
  const email = localStorage.getItem("email");

  setName(name || "");
  setEmail(email || "");
}, []);

  const handleSubmit = async (e) => {
  e.preventDefault();

  
if (!file) {
    alert("Please upload resume ❌");
    return;
  }

  setLoading(true);

try {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("jobId", jobId);
  formData.append("resume", file);

 const res = await axios.post(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/apply",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
);

// redirect to home
navigate("/");

localStorage.setItem(`app_${jobId}`, res.data.applicationId);

  // ✅ SUCCESS FEEDBACK
  alert("Application submitted successfully ✅");

  // ✅ REDIRECT AFTER SHORT DELAY
  setTimeout(() => {
    navigate("/");
  }, 1000);

  // ✅ RESET FORM
  setFile(null);

} catch (err) {
  console.log(err);
  alert("Application failed ❌");
   } finally {
      setLoading(false);
}
};

  return (
  <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">

    <div className="w-full max-w-2xl space-y-6">

      {/* 🧾 JOB CARD */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-2xl font-bold">{job?.title || "Job Role"}</h2>
        <p className="text-gray-600 mt-1">{job?.company}</p>

        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          <span>📍 {job?.location}</span>
          <span>💼 {job?.experience}</span>
          <span className="text-green-600 font-semibold">
            💰 {job?.salary}
          </span>
        </div>
      </div>

      {/* 📄 APPLY FORM */}
      <div className="bg-white p-6 rounded-2xl shadow-md">

        <h3 className="text-xl font-semibold mb-4">
          Apply for this job
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Name */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
  <div className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold">
    {name?.charAt(0).toUpperCase()}
  </div>

  <div>
    <p className="font-semibold">{name}</p>
    <p className="text-sm text-gray-500">{email}</p>
  </div>
</div>

          {/* Email */}
          <input
            type="email"
            value={email}
            readOnly
            className="p-3 border rounded-lg bg-gray-100"
          />

          {/* Resume Upload */}
          <label className="cursor-pointer border p-4 rounded-xl text-center hover:bg-gray-50 transition">
            📄 {file ? file.name : "Upload Resume"}

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
          >
            {loading ? "Submitting..." : "Submit Application 🚀"}
          </button>

        </form>
      </div>

    </div>
  </div>
);
}

export default ApplyForm;