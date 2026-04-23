import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Admin() {
  const [applications, setApplications] = useState([]);
  const addJob = async (e) => {
  e.preventDefault();

  try {
    await axios.post("http://localhost:5000/api/jobs", {
      title,
      company,
      location
    });

    alert("Job added ✅");

    setTitle("");
    setCompany("");
    setLocation("");

  } catch (err) {
    console.log(err);
  }
};
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
const [company, setCompany] = useState("");
const [location, setLocation] = useState("");

useEffect(() => {
  const isAdmin = localStorage.getItem("admin");

  if (!isAdmin) {
    navigate("/login");
  }
}, []);
const handleLogout = () => {
  localStorage.removeItem("admin");
  navigate("/login");
};
  const updateStatus = async (id, status) => {
  try {
    await axios.put(`http://localhost:5000/api/applications/${id}`, { status });

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
    await axios.delete(`http://localhost:5000/api/applications/${id}`);
    setApplications(applications.filter(app => app.id !== id));
  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    axios.get("http://localhost:5000/api/applications")
      .then(res => setApplications(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h1>📋 Applications</h1>
      <button 
  onClick={handleLogout}
  style={{
    marginBottom: "20px",
    padding: "8px 15px",
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  }}
>
  Logout
</button>
<h2>Add Job</h2>

<form onSubmit={addJob}>
  <input 
    type="text"
    placeholder="Job Title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    required
  /><br /><br />

  <input 
    type="text"
    placeholder="Company"
    value={company}
    onChange={(e) => setCompany(e.target.value)}
    required
  /><br /><br />

  <input 
    type="text"
    placeholder="Location"
    value={location}
    onChange={(e) => setLocation(e.target.value)}
    required
  /><br /><br />

  <button type="submit">Add Job</button>
</form>

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        applications.map(app => (
          <div key={app.id} style={{
  border: "1px solid #ccc",
  padding: "15px",
  marginBottom: "10px",
  borderRadius: "8px"
}}>
  <p><b>Name:</b> {app.name}</p>
  <p><b>Email:</b> {app.email}</p>
  <p><b>Job ID:</b> {app.jobId}</p>
  <p><b>Status:</b> {app.status || "Pending"}</p>

<button onClick={() => updateStatus(app.id, "Approved")}>
      Approve
    </button>

  <button onClick={() => updateStatus(app.id, "Rejected")}>
      Reject
    </button>
<p><b>Resume:</b> 
  {app.resume ? (
    <a 
      href={`http://localhost:5000/uploads/${app.resume}`} 
      target="_blank" 
      rel="noreferrer"
    >
      View Resume
    </a>
  ) : (
    "No Resume"
  )}
</p>
  {/* 👇 ADD THIS BUTTON */}
  <button 
    onClick={() => deleteApplication(app.id)}
    style={{
      marginTop: "10px",
      padding: "5px 10px",
      background: "red",
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer"
    }}
  >
    Delete
  </button>
</div>
        ))
      )}
    </div>
  );
}

export default Admin;