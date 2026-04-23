import React, { useEffect, useState } from "react";import ApplyForm from "../components/ApplyForm";
import { fetchJobs } from "../services/api";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchJobs().then(data => setJobs(data));
  }, []);

  // Filter jobs based on search
  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.company.toLowerCase().includes(search.toLowerCase()) ||
    job.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "40px", background: "#f5f7fa", minHeight: "100vh" }}>
      
      <h1 style={{ textAlign: "center" }}>🚀 Job Listings</h1>

      {/* 🔍 Search Bar */}
      <div style={{ maxWidth: "600px", margin: "20px auto" }}>
        <input
          type="text"
          placeholder="Search jobs (title, company, location)..."
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
      <div style={{ maxWidth: "700px", margin: "auto" }}>
        {filteredJobs.length === 0 ? (
          <p>No jobs found</p>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} style={{
              background: "#fff",
              padding: "20px",
              marginBottom: "15px",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
            }}>
              <h2>{job.title}</h2>
              <p>{job.company}</p>
              <p>{job.location}</p>

              <button onClick={() => setSelectedJob(job.id)}>
  Apply Now
</button>
{selectedJob === job.id && <ApplyForm jobId={job.id} />}
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default Jobs;