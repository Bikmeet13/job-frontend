import React, { useState } from "react";
import axios from "axios";

function ApplyForm({ jobId }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
      const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("jobId", jobId);
  formData.append("resume", resume);

    try {
      await axios.post("http://localhost:5000/api/apply",formData, {headers:{
          "Content-Type": "multipart/form-data", },
        name,
        email,
        jobId
      });

      alert("Application submitted with resume ✅");
    } catch (err) {
       console.log(err);   // 👈 IMPORTANT (see error)
    alert("Error submitting application");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "10px" }}>
      <input
        type="text"
        placeholder="Your Name"
        onChange={(e) => setName(e.target.value)}
        required
      /><br /><br />

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        required
      /><br /><br />

      <input
        type="file"
        onChange={(e) => setResume(e.target.files[0])}
        required
      /><br /><br />

      <button type="submit">Submit Application</button>
    </form>
  );
}

export default ApplyForm;