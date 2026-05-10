import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function AdminDashboard() {

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
const [filterStatus, setFilterStatus] = useState("all");
const [filterType, setFilterType] = useState("all"); // all / shortlisted
const [chatData, setChatData] = useState([]);
const [activeChatId, setActiveChatId] = useState(null);

const navigate = useNavigate();

const handleDelete = (id) => {
  if (window.confirm("Are you sure you want to delete this application?")) {
    deleteApplication(id);
  }
};

const handleJobDelete = (id) => {
  if (window.confirm("Are you sure you want to delete this job?")) {
    deleteJob(id);
  }
};

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

const deleteAllApplications = async () => {
  if (!window.confirm("Are you sure you want to delete ALL applications?")) return;

  try {
    await axios.delete(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications",
      {
        headers: {
          authorization: localStorage.getItem("token"),
        },
      }
    );

    setApplications([]); // clear UI
    toast.success("All applications deleted ✅");

  } catch (err) {
    console.log(err);
    toast.error("Unauthorized or failed ❌");
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

const fetchChat = async (id) => {
  try {
    const res = await axios.get(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/chatbot-response/${id}`
    );

    setChatData(res.data);
    setActiveChatId(id); // track which card is open
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

    axios
  .get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist/1")
  .then(res => setShortlisted(res.data))
  .catch(err => console.log(err));

}, []);

// ✅ FETCH SHORTLIST


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


const filteredApplications = applications.filter(app => {

  // ✅ STATUS FILTER
  if (filterStatus !== "all") {
    if ((app.status || "Pending") !== filterStatus) return false;
  }

  // ✅ SHORTLIST FILTER
  if (filterType === "shortlisted") {
    if (!shortlisted.find(item => item.id === app.id)) return false;
  }

  return true;
});


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
  onClick={() => handleJobDelete(job.id)}
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
  
  📋 Applications ({filteredApplications.length})
  
  
</h1>

<div className="flex flex-wrap gap-3 mb-4">

  {/* STATUS FILTER */}
  <div className="flex gap-2 items-center">
  <span className="text-sm font-semibold">Status:</span>

  <button onClick={() => setFilterStatus("all")}
    className={`px-3 py-1 rounded ${filterStatus==="all"?"bg-blue-600 text-white":"bg-gray-200"}`}>
    All
  </button>

  <button onClick={() => setFilterStatus("Approved")}
    className={`px-3 py-1 rounded ${filterStatus==="Approved"?"bg-green-600 text-white":"bg-gray-200"}`}>
    Approved
  </button>

  <button onClick={() => setFilterStatus("Rejected")}
    className={`px-3 py-1 rounded ${filterStatus==="Rejected"?"bg-red-600 text-white":"bg-gray-200"}`}>
    Rejected
  </button>

  <button onClick={() => setFilterStatus("Pending")}
    className={`px-3 py-1 rounded ${filterStatus==="Pending"?"bg-yellow-500 text-white":"bg-gray-200"}`}>
    Pending
  </button>

  </div>


  {/* SHORTLIST FILTER */}
  <div className="flex gap-2 items-center mt-2">
  <span className="text-sm font-semibold">Type:</span>

  <button onClick={() => setFilterType("shortlisted")}
    className={`px-3 py-1 rounded ${filterType==="shortlisted"?"bg-purple-600 text-white":"bg-gray-200"}`}>
    ⭐ Shortlisted
  </button>

  </div>
  

  <button
  onClick={() => {
    setFilterStatus("all");
    setFilterType("all");
  }}
  className="px-3 py-1 rounded bg-blue-600 text-white"
>
  Reset
</button>

  
</div>

      <button
        onClick={handleLogout}
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 mb-6"
      >
        Logout
      </button>

      <button
  onClick={deleteAllApplications}
  className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 ml-2"
>
  🗑 Delete All
</button>

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
       filteredApplications.map(app => (

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

  <button
  onClick={() => {
    console.log("Clicked", app.id);   // 👈 ADD THIS
    fetchChat(app.id);
  }}
>
  💬 View Answers
</button>

{activeChatId === app.id && chatData.length > 0 && (
  <div className="mt-3 bg-gray-100 p-3 rounded">
    {chatData.map((item, i) => (
      <div key={i} className="mb-2">
        <p><b>Q:</b> {item.question}</p>
        <p><b>A:</b> {item.answer}</p>
      </div>
    ))}
  </div>
)}

</div>
            <div className="mt-3 flex gap-3 flex-wrap">

{app.resume ? (
  <a
    href={
  app.resume.startsWith("http")
    ? app.resume
    : `https://humorous-fulfillment-production-1f5e.up.railway.app/uploads/${app.resume}`
}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow hover:scale-105 transition"
  >
    📄 View Resume
  </a>
) : (
  <span className="text-gray-400 mt-2 inline-block">
    No Resume ❌
  </span>
)}

            <button
  onClick={() => handleDelete(app.id)}
  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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
    ? "✔ Shortlisted"
    : "⭐ Shortlist"}
</button>
          </div>
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