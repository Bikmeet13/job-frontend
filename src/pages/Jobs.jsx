import axios from "axios";
import {
  Search,
  Briefcase,
  MapPin,
  Menu
} from "lucide-react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import ApplyForm from "../components/ApplyForm";
import { fetchJobs } from "../services/api";
import toast from "react-hot-toast";


function Jobs() {

const role = localStorage.getItem("role");
  const [savedJobs, setSavedJobs] = useState([]);
  const username = localStorage.getItem("username");
const token = localStorage.getItem("token");
const profilePic = localStorage.getItem("profilePic");

  const navigate = useNavigate();
  

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

const [modeFilter, setModeFilter] = useState("");

const [experienceFilter, setExperienceFilter] = useState("");

const [salaryFilter, setSalaryFilter] = useState("");

const [appliedJobs, setAppliedJobs] = useState([]);
  
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appliedMap, setAppliedMap] = useState({});
  
   useEffect(() => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // ✅ Only redirect if user is ACTUALLY logged in
  if (token && (role === "admin" || role === "superadmin")) {
    navigate("/admin");
  }
}, []);

  useEffect(() => {
  fetchJobs()
    .then((data) => {
      console.log("JOBS API:", data);

      setJobs(data);

      setLoading(false); // ✅ ADD HERE
    })
    .catch((err) => {
      console.error("API Error:", err);

      setLoading(false); // ✅ ALSO HERE
    });
}, []);

useEffect(() => {
  const userId = localStorage.getItem("userId");

  if (!userId) return;

  fetch(
    `https://humorous-fulfillment-production-1f5e.up.railway.app/api/saved-jobs/${userId}`
  )
    .then((res) => res.json())
    .then((data) => {
      console.log("SAVED JOBS:", data);

      // ✅ store only job IDs
      const ids = data.map((job) => job.job_id || job.id);

console.log("Saved IDs:", ids);
      setSavedJobs(ids);
    })
    .catch((err) => console.log(err));
}, []);

  const filteredJobs = Array.isArray(jobs)
    ? jobs
  .filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase())
  )

  .filter((job) =>
    locationFilter
      ? job.location
          .toLowerCase()
          .includes(locationFilter.toLowerCase())
      : true
  )

  .filter((job) =>
    modeFilter
      ? job.mode === modeFilter
      : true
  )

  .filter((job) =>
    experienceFilter
      ? job.experience
          .toLowerCase()
          .includes(experienceFilter.toLowerCase())
      : true
  )

  .filter((job) =>
    salaryFilter
      ? job.salary
          .toLowerCase()
          .includes(salaryFilter.toLowerCase())
      : true
  )
    : [];

    useEffect(() => {
  const checkAppliedJobs = async () => {
    const email = localStorage.getItem("email"); // 👈 make sure email exists

    if (!email || jobs.length === 0) return;

    for (let job of jobs) {
      try {
        const res = await axios.get(
          "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/check",
          {
            params: {
              jobId: job.id,
              email: email
            }
          }
        );

        setAppliedMap(prev => ({
          ...prev,
          [job.id]: res.data.applied
        }));

      } catch (err) {
        console.log(err);
      }
    }
  };

  checkAppliedJobs();
}, [jobs]);

useEffect(() => {
  const appliedJobs = JSON.parse(localStorage.getItem("appliedJobs") || "[]");

  const map = {};
  appliedJobs.forEach(id => {
    map[id] = true;
  });

  setAppliedMap(map);
}, []);


if (loading) {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
  return (
    <div
  className={`min-h-screen p-6 md:p-10 transition-all duration-500 ${
    darkMode
      ? "bg-gray-900 text-white"
      : "bg-gradient-to-b from-gray-100 to-gray-200 text-black"
  }`}
>

     

       {/* 🔝 Navbar */}
<div
  className={`sticky top-0 z-50 backdrop-blur-xl border border-white/10 shadow-lg px-6 py-4 mb-10 flex items-center justify-between rounded-2xl transition-all duration-300 ${
    darkMode
      ? "bg-gray-900/70"
      : "bg-white/70"
  }`}
>

  {/* 🏷️ Logo */}
  <div className="flex items-center gap-2">

    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
      alt="logo"
      className="w-8 h-8 md:w-10 md:h-10"
    />

    <h2
      className={`text-lg md:text-2xl font-bold ${
        darkMode
          ? "text-white"
          : "text-gray-800"
      }`}
    >
      Marketlence Jobs
    </h2>

  </div>

  {/* 💻 Desktop Links */}
  <div className="hidden md:flex items-center gap-4">

    {token && (
  <div
    onClick={() => navigate("/profile")}
    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
  >
    <img
      src={
        profilePic
          ? profilePic
          : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
      }
      alt="profile"
      className="w-8 h-8 rounded-full object-cover border"
    />

    {/* ❌ Only hide THIS on mobile */}
    <span className="font-semibold text-blue-600 hidden md:block">
      {username}
    </span>
  </div>
)}

    {/* Dark Mode */}
    <button
      onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      {darkMode ? "☀️ Light" : "🌙 Dark"}
    </button>

    {/* Links */}
    
    <button onClick={() => navigate("/")} className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
  Home
</button>

    <a
      href="#"
      
      className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      Jobs
    </a>

    {(role === "admin" || role === "superadmin") && (
  <button
    onClick={() => navigate("/admin-applications")}
   
   className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
    Applications
  </button>
)}

    {token ? (
  <>
    <button
      onClick={() => navigate("/dashboard")}
      className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      Dashboard
    </button>

    <button
      onClick={() => {
        localStorage.removeItem("token");
localStorage.removeItem("role");
localStorage.removeItem("userId");
         toast.success("Logged out 👋");

  window.location.href = "/login";
}}
      className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-red-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
    >
      Logout
    </button>
  </>
) : (
  <>
    <button
      onClick={() => navigate("/login")}
          className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      Login
    </button>

    <button
      onClick={() => navigate("/signup")}
           className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      Signup
    </button>
  </>
)}
  </div>

  {/* 📱 Mobile Right Side */}
  <div className="flex items-center gap-3 md:hidden">

    {/* Dark Mode */}
    <button
      onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      {darkMode ? "☀️" : "🌙"}
    </button>

    {/* Hamburger */}
    <button
      onClick={() => setMenuOpen(!menuOpen)}
          className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
      <Menu size={26} />
    </button>

  </div>

</div>

{/* 📱 Mobile Dropdown Menu */}
{menuOpen && (

  <div
    className={`md:hidden rounded-2xl p-6 mb-6 shadow-lg ${
      darkMode
        ? "bg-gray-800 text-white"
        : "bg-white text-black"
    }`}
  >

    <div className="flex flex-col gap-4">
      {token && (
  <p className="font-semibold text-blue-600">
    👋 {username}
  </p>
)}

      <button
  onClick={() => navigate("/profile")}
  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]
  ${darkMode ? "text-gray-200" : "text-gray-700"}`}
>
  Profile
</button>

      <button onClick={() => navigate("/dashboard")}
         className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
        Dashboard
      </button>

     {(role === "admin" || role === "superadmin") && (
  <button onClick={() => navigate("/admin-applications")} className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
    Applications
  </button>
)}

      <button onClick={() => navigate("/login")} className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
        Login
      </button>

      <button onClick={() => navigate("/signup")} className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
        Signup
      </button>

    </div>

  </div>

)}

      
            {/* 🚀 Hero Section */}
<div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-10 md:p-20 text-center shadow-2xl mb-20">

  <h1 className="text-4xl md:text-6xl font-bold drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
    Find Your Dream Job
  </h1>

  <p className="mt-5 text-xl text-blue-100">
    Discover top opportunities from leading companies
  </p>

  <div className="flex justify-center gap-4 mt-10">

    <button
      onClick={() => {
        window.scrollTo({
          top: 700,
          behavior: "smooth"
        });
      }}
      className="border border-white px-5 py-3 md:px-8 md:py-4 rounded-2xl font-semibold hover:bg-white hover:text-blue-700 transition"
>
      Find Jobs
    </button>

    <button
      onClick={() => {
  const role = localStorage.getItem("role");

  if (!role) {
    navigate("/signup"); // 👈 new
  } else if (role === "admin" || role === "superadmin") {
    navigate("/admin"); // 👈 already admin
  } else {
    navigate("/signup"); // 👈 normal user
  }
}}
      className="border border-white px-5 py-3 md:px-8 md:py-4 rounded-2xl font-semibold hover:bg-white hover:text-blue-700 transition"
>
      Post Job
    </button>

  </div>

</div>

{/* 🧭 Title */}
      <h1
  className={`text-5xl font-bold text-center mb-5 ${
    darkMode
      ? "text-white"
      : "text-gray-800"
  }`}
>
        🚀 Job Listings
      </h1>
      {/* 🔍 Search Bar */}
<div className="max-w-2xl mx-auto mb-10 relative">

  <Search
    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
    size={20}
  />

  <input
    type="text"
    placeholder="Search jobs..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className={`w-full pl-12 p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-black border-gray-300"
}`}
  />

</div>

<div className="grid md:grid-cols-4 gap-4 mb-8">

  <input
    type="text"
    placeholder="Location"
    value={locationFilter}
    onChange={(e) => setLocationFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-black border-gray-300"
}`}
  />

  <select
    value={modeFilter}
    onChange={(e) => setModeFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-black border-gray-300"
}`}
  >
    <option value="">All Modes</option>
    <option value="Remote">Remote</option>
    <option value="Onsite">Onsite</option>
    <option value="Hybrid">Hybrid</option>
  </select>

  <input
    type="text"
    placeholder="Experience"
    value={experienceFilter}
    onChange={(e) => setExperienceFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-black border-gray-300"
}`}
  />

  <input
    type="text"
    placeholder="Salary"
    value={salaryFilter}
    onChange={(e) => setSalaryFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-black border-gray-300"
}`}
  />

</div>

      {/* 📋 Job List */}
      <div className="max-w-7xl mx-auto mt-10">

        {filteredJobs.length === 0 ? (

          <p className="text-center text-gray-500">
            No jobs found
          </p>

        ) : (

          <div className="grid md:grid-cols-2 gap-8">

           {filteredJobs.map((job) => {
            const appId = localStorage.getItem(`app_${job.id}`);

  // ✅ DEBUG HERE (clean way)
  console.log("Job ID:", job.id);
  console.log("Is Saved:", savedJobs.includes(job.id));

  const completed = localStorage.getItem(`done_${job.id}`);

  return (
    <motion.div
      onClick={() => navigate(`/jobs/${job.id}`)}
      key={job.id}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl transition duration-500 ${
        darkMode
          ? "bg-gray-800 text-white"
          : "bg-white text-black"
      }`}
    >

                {/* 🖼️ Logo + Info */}
                <div className="flex items-center gap-4">
                  
                  <img
                    src={
  job.company === "Google"
    ? "https://cdn-icons-png.flaticon.com/512/300/300221.png"
    : job.company === "Amazon"
    ? "https://cdn-icons-png.flaticon.com/512/5968/5968870.png"
    : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
}
                    alt="logo"
                    className="rounded-xl w-14 h-14"
                  />

                  <div>
                    <h2
  className={`text-2xl font-bold ${
    darkMode
      ? "text-white"
      : "text-gray-800"
  }`}
>
                      {job.title}
                    </h2>

                    <div className="flex items-center gap-2 text-gray-600 mt-1">
  <Briefcase size={16} />
  <p>{job.company}</p>
</div>

<div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
  <MapPin size={16} />
  <p>{job.location}</p>
</div>
<p
  className={`mt-3 line-clamp-2 ${
    darkMode
      ? "text-gray-300"
      : "text-gray-500"
  }`}
>
  {job.description || "No description available"}
</p>
<p className="text-sm text-green-600 font-semibold mt-2">
  💰 {job.salary}
</p>

<p className="text-sm text-gray-500">
  🧠 {job.experience}
</p>
<p className="text-sm text-blue-500 mt-1">
  🛠️ {job.skills}
</p>
                  </div>

                </div>

                {/* 🏷️ Tags */}
                <div className="flex gap-2 mt-4">

                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">
                    Full-time
                  </span>

                  <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs">
                    Remote
                  </span>

                </div>

                {/* 🔘 Apply Button */}
               
{completed ? (
  <button className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
    Application Completed ✅
  </button>
) : appId ? (
  <button
    onClick={(e) => {
      e.stopPropagation();
      navigate(`/chatbot?applicationId=${appId}&jobId=${job.id}`);
    }}
    className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
    Start Interview 🚀
  </button>
) : (
  <span className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
    Check Details & Apply </span>
)}

                
                <button
  className={`mt-3 w-full py-2 rounded-xl font-semibold transition flex items-center justify-center gap-2
    ${
      savedJobs.includes(job.id)
        ? "bg-red-500 text-white"
        : "border border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
    }`}
  onClick={(e) => {
    e.stopPropagation();
     if (savedJobs.includes(job.id)) return;

    const userId = localStorage.getItem("userId");

    fetch("https://humorous-fulfillment-production-1f5e.up.railway.app/api/save-job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: userId,
        job_id: job.id
      })
    })
      .then(() => {
        toast.success("Job saved ❤️");

        // ✅ update UI state
        setSavedJobs((prev) => [...prev, job.id]);
      })
      .catch((err) => console.log(err));
  }}
>
  <Heart size={18} />
  {savedJobs.includes(job.id) ? "Saved ❤️" : "Save Job"}
</button>

{/* 🤖 Resume Match */}
<div className="mt-3">

  <input
  type="file"
  accept=".pdf"
  className="mb-3 w-full text-sm"

  onClick={(e) => e.stopPropagation()}

  onChange={async (e) => {

    e.stopPropagation();

    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("resume", file);

    formData.append(
      "jobSkills",
      job.skills || ""
    );

    formData.append("jobId", job.id);

    try {

      const res = await fetch(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/resume-match",
        {
          method: "POST",
          body: formData
        }
      );

      if (!res.ok) {

  const errorText = await res.text();

  console.log("SERVER ERROR:", errorText);

  throw new Error(errorText);

}

const data = await res.json();

      toast.success(
        `Resume Match: ${data.score}% 🔥`
      );

    } catch (err) {

      console.log(err);

      toast.error("Match failed ❌");

    }

  }}
/>

  <button
  onClick={(e) => e.stopPropagation()}
    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition"
  >
    Check Resume Match 🤖
  </button>

</div>

                
              </motion.div>

);
})}

          </div>

        )}

      </div>

      {/* ✅ GLOBAL MODAL (CORRECT PLACE) */}
{selectedJob && (
  <div
    className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 animate-fadeIn"
    onClick={() => setSelectedJob(null)}
  >
    <div
       className="bg-white p-6 rounded-xl animate-scaleIn"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close */}
      <button
        className="absolute top-2 right-3 text-xl font-bold"
        onClick={() => setSelectedJob(null)}
      >
        ✖
      </button>

      <h2 className="text-2xl font-bold mb-4 text-center">
        Apply for Job
      </h2>

      <ApplyForm jobId={selectedJob?.id} />
    </div>
  </div>
)}
      
{/* 🌙 Footer */}
<footer className="bg-gray-900 text-white mt-20 rounded-2xl p-10">

  <div className="grid md:grid-cols-3 gap-10">

    {/* Logo */}
    <div>
      <h2
  className={`text-2xl font-bold ${
    darkMode
      ? "text-white"
      : "text-gray-800"
  }`}
>
        Marketlence Jobs
      </h2>

      <p className="text-gray-400 mt-3">
        Find your dream job with top companies worldwide.
      </p>
    </div>

    {/* Links */}
    <div>
      <h3 className="font-semibold text-lg mb-3">
        Quick Links
      </h3>

      <ul className="space-y-2 text-gray-400">
        <li>Home</li>
        <li>Jobs</li>
        <li>Login</li>
        <li>Signup</li>
      </ul>
    </div>

    {/* Contact */}
    <div>
      <h3 className="font-semibold text-lg mb-3">
        Contact
      </h3>

      <p className="text-gray-400">
        support@marketlence.com
      </p>
    </div>

  </div>

  <div className="border-t border-gray-700 mt-10 pt-5 text-center text-gray-500">
    © 2026 Marketlence Jobs. All rights reserved.
  </div>

</footer>

    </div>
  );
}

export default Jobs;