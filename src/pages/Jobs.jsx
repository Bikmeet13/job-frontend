import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import ApplyForm from "../components/ApplyForm";
import { fetchJobs } from "../services/api";

function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
  fetchJobs()
    .then((data) => {
      console.log(data);
      setJobs(data);
    })
    .catch((err) => {
      console.error("API Error:", err);
    });
}, []);

  const filteredJobs = Array.isArray(jobs)
  ? jobs.filter((job) =>
      (job.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(search.toLowerCase())
    )
  : [];
 return (
  
  <div style={{ padding: "40px", background: "#f5f7fa", minHeight: "100vh" }}>

{/* 🔝 Navbar */}
<div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 20px",
  background: "#ffffff",
  borderRadius: "10px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  marginBottom: "30px",
   // ✅ sticky fix
      position: "sticky",
      top: 0,
      zIndex: 1000
}}>

  {/* 🏷️ Logo + Title */}
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
      alt="logo"
      style={{ width: "40px", height: "40px" }}
    />

    <h2 style={{ margin: 0, color: "#333" }}>
      Marketlence Jobs
    </h2>
  </div>

  {/* 🔗 Links */}
  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>

  {/* Home */}
  <a
    href="https://marketlence.com"
    style={{
      textDecoration: "none",
      color: "#007bff",
      fontWeight: "500"
    }}
  >
    Home
  </a>

  {/* Jobs */}
  <a
    href="#"
    style={{
      textDecoration: "none",
      color: "#333",
      fontWeight: "500"
    }}
  >
    Jobs
  </a>

  {/* Login */}
<button
  onClick={() => navigate("/login")}
  style={{
    padding: "6px 12px",
    border: "1px solid #007bff",
    background: "transparent",
    color: "#007bff",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
  Login
</button>

{/* Signup */}
<button
  onClick={() => navigate("/signup")}
  style={{
    padding: "6px 12px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
  Signup
</button>

</div>

</div>

    {/* 🧭 Title */}
    <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
      🚀 Job Listings
    </h1>

    {/* 🔍 Search Bar */}
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <input
        type="text"
        placeholder="Search jobs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ccc"
        }}
      />
    </div>
      {/* 📋 Job List */}
      <div style={{ maxWidth: "800px", margin: "auto" }}>
        {filteredJobs.length === 0 ? (
          <p style={{ textAlign: "center" }}>No jobs found</p>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: "#fff",
                padding: "20px",
                marginBottom: "20px",
                borderRadius: "12px",
                boxShadow: "0 6px 15px rgba(0,0,0,0.08)",
                transition: "0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 6px 15px rgba(0,0,0,0.08)";
              }}
            >

              {/* 🖼️ Logo + Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <img
                  src="https://via.placeholder.com/50"
                  alt="logo"
                  style={{ borderRadius: "10px" }}
                />

                <div>
                  <h2 style={{ margin: 0 }}>{job.title}</h2>

                  <p style={{ margin: "5px 0", color: "#555" }}>
                    {job.company}
                  </p>

                  <p style={{ fontSize: "14px", color: "#777" }}>
                    📍 {job.location}
                  </p>
                </div>
              </div>

              {/* 🏷️ Tags */}
              <div style={{ marginTop: "10px" }}>
                <span
                  style={{
                    background: "#eef2ff",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    marginRight: "8px"
                  }}
                >
                  Full-time
                </span>

                <span
                  style={{
                    background: "#e0f7fa",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "12px"
                  }}
                >
                  Remote
                </span>
              </div>

              {/* 🔘 Apply Button */}
              <button
                style={{
                  marginTop: "12px",
                  padding: "10px 16px",
                  background: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
                onClick={(e) => {
  e.stopPropagation();
  setSelectedJob(job.id);
}}
              >
                Apply Now
              </button>

              {/* 📄 Apply Form */}
              {selectedJob === job.id && (
                <ApplyForm jobId={job.id} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Jobs;