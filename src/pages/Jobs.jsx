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
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

const [modeFilter, setModeFilter] = useState("");

const [experienceFilter, setExperienceFilter] = useState("");

const [salaryFilter, setSalaryFilter] = useState("");
  
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
  className={`sticky top-0 z-50 backdrop-blur-lg shadow-md rounded-2xl px-4 py-4 mb-10 flex items-center justify-between ${
    darkMode
      ? "bg-gray-900/80"
      : "bg-white/80"
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

    {/* Dark Mode */}
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      {darkMode ? "☀️ Light" : "🌙 Dark"}
    </button>

    {/* Links */}
    <button
      onClick={() => navigate("/profile")}
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      Profile
    </button>

    <a
      href="https://marketlence.com"
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      Home
    </a>

    <a
      href="#"
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      Jobs
    </a>

    <button
      onClick={() => navigate("/dashboard")}
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      Dashboard
    </button>

    <button
      onClick={() => navigate("/admin-applications")}
      className={`font-medium transition ${
        darkMode
          ? "text-gray-200 hover:text-white"
          : "text-gray-700 hover:text-black"
      }`}
    >
      Applications
    </button>

    {/* Login */}
    <button
      onClick={() => navigate("/login")}
      className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
    >
      Login
    </button>

    {/* Signup */}
    <button
      onClick={() => navigate("/signup")}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
    >
      Signup
    </button>

  </div>

  {/* 📱 Mobile Right Side */}
  <div className="flex items-center gap-3 md:hidden">

    {/* Dark Mode */}
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`font-medium ${
        darkMode
          ? "text-white"
          : "text-black"
      }`}
    >
      {darkMode ? "☀️" : "🌙"}
    </button>

    {/* Hamburger */}
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      className={`${
        darkMode
          ? "text-white"
          : "text-black"
      }`}
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

      <button onClick={() => navigate("/profile")}>
        Profile
      </button>

      <button onClick={() => navigate("/dashboard")}>
        Dashboard
      </button>

      <button onClick={() => navigate("/admin-applications")}>
        Applications
      </button>

      <button onClick={() => navigate("/login")}>
        Login
      </button>

      <button onClick={() => navigate("/signup")}>
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
      className="bg-white/80 backdrop-blur-lg text-blue-700 px-5 py-3 md:px-8 md:py-4 rounded-2xl font-semibold hover:bg-gray-100 hover:scale-105 transition"
    >
      Find Jobs
    </button>

    <button
      onClick={() => navigate("/admin-login")}
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

            {filteredJobs.map((job) => (

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
                <button
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJob(job.id);
                  }}
                >
                  Apply Now
                </button>
                
                <button
  className="mt-3 w-full border border-red-400 text-red-500 py-2 rounded-xl font-semibold hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2"
  onClick={(e) => {
    e.stopPropagation();

    fetch(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/save-job",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: 1,
          job_id: job.id
        })
      }
    )
      .then(() => toast.success("Job saved ❤️"))
      .catch((err) => console.log(err));
  }}
>
  <Heart size={18} />
  Save Job
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

    try {

      const res = await fetch(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/resume-match",
        {
          method: "POST",
          body: formData
        }
      );

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

                {/* 📄 Apply Form */}
                {selectedJob === job.id && (
                  <div className="mt-5">
                    <ApplyForm jobId={job.id} />
                  </div>
                )}

              </motion.div>

            ))}

          </div>

        )}

      </div>
      
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