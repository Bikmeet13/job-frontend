import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function AdminDashboard() {

const [filter, setFilter] = useState("all");
  const [shortlisted, setShortlisted] = useState([]);
    const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState("");
const [company, setCompany] = useState("");
const [location, setLocation] = useState("");
const [salary, setSalary] = useState("");
const [experience, setExperience] = useState("");
const [skills, setSkills] = useState("");
const [type, setType] = useState("");
const [mode, setMode] = useState("");

const navigate = useNavigate();

const addToShortlist = async (app) => {
  try {
    await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist",
      {
        applicationId: app.id,
        userId: 1
      }
    );

    setShortlisted([...shortlisted, app]);

  } catch (err) {
    console.log(err);
  }
};

  const addJob = async (e) => {
  e.preventDefault();

  try {
    await axios.post(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs",
  {
    title,
    company,
    location,
    salary,
    experience,
    skills,
    type,
    mode
  }
);

    toast.success("Job added successfully 🚀");

    setJobs([{ title, company, location, salary }, ...jobs]);
  
     // clear form
    setTitle("");
    setCompany("");
    setLocation("");
    setSalary("");
    setExperience("");
    setSkills("");
    setType("");
    setMode("");
  
  } catch (err) {
    console.log(err);
    toast.error("Failed to add job ❌");
  }
};

  
useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
  }
}, [navigate]);
const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/login");
};
  const updateStatus = async (id, status) => {
  try {
    await axios.put(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`, { status });

    // Update UI instantly
    setApplications(applications.map(app =>
      app.id === id ? { ...app, status } : app
    ));
  } catch (err) {
    console.log(err);
  }
};
  const deleteApplication = async (id) => {
  try {
    await axios.delete(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`);
    setApplications(applications.filter(app => app.id !== id));
  } catch (err) {
    console.log(err);
  }
};

const removeFromShortlist = async (id) => {
  try {
    await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist/${id}`
    );

    setShortlisted(shortlisted.filter(item => item.id !== id));

  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {

  // ✅ FETCH JOBS
  axios.get(
    "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs"
  )
    .then(res => setJobs(res.data))
    .catch(err => console.log(err));

  // ✅ FETCH APPLICATIONS
  axios.get(
    "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications",
    {
      headers: {
        authorization: localStorage.getItem("token")
      }
    }
  )
    .then(res => setApplications(res.data))
    .catch(err => console.log(err));

}, []);

// ✅ FETCH SHORTLIST
axios
  .get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist/1")
  .then(res => setShortlisted(res.data))
  .catch(err => console.log(err));

const deleteJob = async (id) => {
  console.log("Deleting job:", id);

  try {
    const res = await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${id}`
    );

    console.log(res.data);

    setJobs(jobs.filter(job => job.id !== id));

    alert("Job deleted ✅");

  } catch (err) {
    console.log(err);
  }
};
  return (
  <div className="p-10 bg-gray-100 min-h-screen">

    <div className="max-w-5xl mx-auto">

      {/* 🔹 JOBS SECTION */}
      <h1 className="text-2xl font-bold mb-4">💼 Jobs Section</h1>

      {jobs.map(job => (
        <div
          key={job.id}
          className="bg-white shadow-md rounded-lg p-4 mb-4 border"
        >
          <h3 className="text-lg font-semibold">{job.title}</h3>
          <p>{job.company}</p>
          <p>{job.location}</p>

          <button
            onClick={() => deleteJob(job.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      ))}

      {/* 🔹 ADD JOB CARD */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">➕ Add Job</h2>

        <form onSubmit={addJob}>
          <input
            type="text"
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Salary"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Job Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Remote / On-site"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Job
          </button>
        </form>
      </div>

      {/* 🔹 APPLICATIONS SECTION */}
      <h1 className="text-2xl font-bold mb-4 mt-10">
  📋 Applications (
  {
    applications.filter(app => {
      if (filter === "all") return true;
      if (filter === "shortlisted") {
        return shortlisted.find(item => item.id === app.id);
      }
      return true;
    }).length
  }
  )
</h1>

<div className="flex gap-3 mb-4">

  <button
    onClick={() => setFilter("all")}
    className={`px-4 py-1 rounded ${
      filter === "all"
        ? "bg-blue-600 text-white"
        : "bg-gray-200"
    }`}
  >
    All
  </button>

  <button
    onClick={() => setFilter("shortlisted")}
    className={`px-4 py-1 rounded ${
      filter === "shortlisted"
        ? "bg-blue-600 text-white"
        : "bg-gray-200"
    }`}
  >
    Shortlisted
  </button>

</div>
      <button
        onClick={handleLogout}
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 mb-6"
      >
        Logout
      </button>

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        applications
  .filter(app => {
    if (filter === "all") return true;
    if (filter === "shortlisted") {
      return shortlisted.find(item => item.id === app.id);
    }
    return true;
  })
  .map(app => (

          <div
            key={app.id}
            className="bg-white shadow-md rounded-lg p-5 mb-4 border"
          >
            <p><b>Name:</b> {app.name}</p>
            {shortlisted.find(item => item.id === app.id) && (
  <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
  ✔ Shortlisted
</span>
)}
            <p><b>Email:</b> {app.email}</p>
            <p><b>Job ID:</b> {app.jobId}</p>

           <p className="mb-2">
  <b>Status:</b>{" "}
  <span
    className={`ml-2 px-2 py-1 rounded text-white text-sm font-semibold ${
      app.status === "Approved"
        ? "bg-green-500"
        : app.status === "Rejected"
        ? "bg-red-500"
        : "bg-yellow-500"
    }`}
  >
    {app.status || "Pending"}
  </span>
</p>

            <div className="mt-2 flex gap-2">
  <button
    onClick={() => updateStatus(app.id, "Approved")}
    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
  >
    Approve
  </button>

  <button
    onClick={() => updateStatus(app.id, "Rejected")}
    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
  >
    Reject
  </button>
</div>
            <p>
              <b>Resume:</b>{" "}
              {app.resume ? (
                <a
                  href={`https://humorous-fulfillment-production-1f5e.up.railway.app/uploads/${app.resume}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Resume
                </a>
              ) : (
                "No Resume"
              )}
            </p>

            <button

            
  onClick={() => deleteApplication(app.id)}
  className="mt-3 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
>
  Delete
</button>

<button
  onClick={() => addToShortlist(app)}
  disabled={shortlisted.find(item => item.id === app.id)}
  className={`px-3 py-1 rounded text-white ml-2 ${
    shortlisted.find(item => item.id === app.id)
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-500 hover:bg-blue-600"
  }`}
>
  {shortlisted.find(item => item.id === app.id)
    ? "✔ Added"
    : "⭐ Shortlist"}
</button>
          </div>
          
        ))
      )}
      

<h1 className="text-2xl font-bold mt-10 mb-4">
  ⭐ Shortlisted ({shortlisted.length})
</h1>

<button
  onClick={() => setShortlisted([])}
  className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
>
  Clear All ❌
</button>

{shortlisted.length === 0 ? (
  <p className="text-gray-500">No shortlisted candidates yet</p>
) : (
  shortlisted.map(app => (
    <div
      key={app.id}
      className="bg-white shadow-md rounded-lg p-4 mb-4 border"
    >
      <p><b>Name:</b> {app.name}</p>
      {shortlisted.find(item => item.id === app.id) && (
  <span className="ml-2 text-green-600 font-bold">
    ✔ Shortlisted
  </span>
)}
      <p><b>Email:</b> {app.email}</p>
      <p><b>Job ID:</b> {app.jobId}</p>

      <button
        onClick={() => removeFromShortlist(app.id)}
        
        className="mt-2 px-3 py-1 bg-red-500 text-white rounded"
      >
        Remove ❌
      </button>

      
    </div>

    
  ))
)}

    </div>

  </div>
);
}


export default AdminDashboard;