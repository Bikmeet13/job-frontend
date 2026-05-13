import { API } from "../services/api";
import React, { useState, useEffect } from "react";
import axios from "axios";

function ApplyForm({ jobId }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
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

localStorage.setItem(`app_${jobId}`, res.data.applicationId);

  // ✅ SUCCESS FEEDBACK
  alert("Application submitted successfully ✅");

 
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

    <div className="bg-white p-6 rounded-2xl shadow-lg">

  <form
    onSubmit={handleSubmit}
    className="flex flex-col gap-4"
  >

    <input
  type="text"
  placeholder="Your Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
/>

    <input
  type="email"
  placeholder="Your Email"
  value={email || ""}
  onChange={(e) => setEmail(e.target.value)}
  className="p-3 border rounded-lg"
/>

    <input
      type="file"
      onChange={(e) => setFile(e.target.files[0])}
      className="p-2 border rounded-lg bg-gray-50"
    />

    <button
  type="submit"
  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
>
  {loading ? "Submitting..." : "Submit Application"}
        </button>

  </form>

</div>
  );
}

export default ApplyForm;