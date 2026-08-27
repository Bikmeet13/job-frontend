import axios from "axios";
import {
  Search,
  Briefcase,
  MapPin,
  Menu,
  Share2,
  BellRing,
  FileText
} from "lucide-react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import ApplyForm from "../components/ApplyForm";
import HomepageAd from "../components/HomepageAd";
import JobNotificationPrompt from "../components/JobNotificationPrompt";
import EmploymentNews from "../components/EmploymentNews";
import { fetchJobs } from "../services/api";
import FeaturedJobsSection from "../components/FeaturedJobsSection";
import { COUNTRIES, COUNTRY_NAMES } from "../data/countries";
import { VISA_SPONSORSHIP_RESOURCES } from "../data/visaSponsorshipResources";
import toast from "react-hot-toast";


function Jobs() {

const role = localStorage.getItem("role");
  const [savedJobs, setSavedJobs] = useState([]);
  const username = localStorage.getItem("username");
const token = localStorage.getItem("token");
const profilePic = localStorage.getItem("profilePic");
const [externalJobs, setExternalJobs] = useState([]);
const [googleSearch, setGoogleSearch] = useState("");
const [googleLocation, setGoogleLocation] = useState("");
const [userLocation, setUserLocation] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState(
  localStorage.getItem("jobSearch") || ""
);
 const [locationFilter, setLocationFilter] = useState(
  localStorage.getItem("jobLocation") || ""
);

const [modeFilter, setModeFilter] = useState(
  localStorage.getItem("jobMode") || ""
);

const [experienceFilter, setExperienceFilter] = useState("");

const [salaryFilter, setSalaryFilter] = useState("");
const [jobCategoryFilter, setJobCategoryFilter] = useState(
  localStorage.getItem("jobCategory") || ""
);
const [sortFilter, setSortFilter] = useState("newest");

const [appliedJobs, setAppliedJobs] = useState([]);
  
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appliedMap, setAppliedMap] = useState({});
  const [locating, setLocating] = useState(false);
const [country, setCountry] = useState("in");

  const shareJob = async (event, job) => {
    event.stopPropagation();

    const jobUrl = job.source
      ? (job.applyLink || job.url || window.location.href)
      : `${window.location.origin}/jobs/${job.job_slug || job.id}`;
    const shareData = {
      title: `${job.title} at ${job.company}`,
      text: `Check out this job: ${job.title} at ${job.company}`,
      url: jobUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jobUrl);
        toast.success("Job link copied to clipboard");
      } else {
        window.prompt("Copy this job link:", jobUrl);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        toast.error("Could not share this job. Please try again.");
      }
    }
  };

  const getUserLocation = async () => {
  if (!navigator.geolocation) {
    toast.error("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );

        const city =
          res.data.address.city ||
          res.data.address.town ||
          res.data.address.village ||
          res.data.address.state ||
          "";

        setUserLocation(city);
        setLocationFilter(city);

        toast.success(`Location detected: ${city}`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to detect location");
      }
    },
    (err) => {
      console.error(err);
      toast.error("Location permission denied");
    }
  );
};

const fetchArbeitnowJobs = async () => {
  try {
    const res = await axios.get(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/arbeitnow-jobs",
      {
        params: {
          query: search,
        },
      }
    );

    const formattedJobs = res.data.map((job) => ({
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location,
      salary: "Not disclosed",
      description: job.description,
      mode: job.remote ? "Remote" : "Onsite",
      experience: "",
      skills: (job.tags || []).join(", "),
      jobCategory: "Private",
      postedAt: job.created_at || job.created || null,
      applyLink: job.url,
      source: "arbeitnow",
    }));

    setExternalJobs(prev => [...prev, ...formattedJobs]);

  } catch (err) {
    console.log(err);
  }
};

const fetchAllExternalJobs = async () => {
  setExternalJobs([]);

  await Promise.all([
    fetchExternalJobs(),
    fetchArbeitnowJobs(),
  ]);
};

  useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );

        const city =
          res.data.address.city ||
          res.data.address.town ||
          res.data.address.state ||
          "";

        setUserLocation(city);
        setLocationFilter(city);

        console.log("Detected Location:", city);
      } catch (err) {
        console.log(err);
      }
    },
    (err) => {
      console.log("Location denied", err);
    }
  );
}, []);
  
   useEffect(() => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // ✅ Only redirect if user is ACTUALLY logged in
  if (token && (role === "admin" || role === "superadmin")) {
    navigate("/admin");
  }
}, []);

useEffect(() => {
  localStorage.setItem("jobSearch", search);
  localStorage.setItem("jobLocation", locationFilter);
  localStorage.setItem("jobMode", modeFilter);
  localStorage.setItem("jobCategory", jobCategoryFilter);
}, [search, locationFilter, modeFilter, jobCategoryFilter, country]);

useEffect(() => {
  const savedExternalJobs = localStorage.getItem("externalJobs");

  if (savedExternalJobs) {
    setExternalJobs(JSON.parse(savedExternalJobs));
  }
}, []);

  useEffect(() => {
  // Job lists can become very large. They belong in the database/API, not in
  // the browser's small local-storage quota. Remove the old cache once.
  try {
    localStorage.removeItem("jobs");
  } catch {
    // The page can still load if browser storage is unavailable.
  }

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
      const ids = data.map(
  (job) => job.job_id || job.external_job_id
);

console.log("Saved IDs:", ids);
      setSavedJobs(ids);
    })
    .catch((err) => console.log(err));
}, []);

useEffect(() => {
  const timer = setTimeout(() => {
    fetchAllExternalJobs();
  }, 800);

  return () => clearTimeout(timer);
}, [search, locationFilter, modeFilter, country]);

const fetchExternalJobs = async () => {
  try {
    const res = await axios.get(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/external-jobs",
      {
        params: {
  query: search,
  location: locationFilter,
  country: country,
  mode: modeFilter,
}
      }
    );

   const formattedJobs = res.data.map((job) => ({
  id: job.id,
  title: job.title,
  company: job.company?.display_name || "Unknown",
  location: job.location?.display_name || "Not specified",
  salary:
    job.salary_min && job.salary_max
      ? `₹${job.salary_min.toLocaleString()} - ₹${job.salary_max.toLocaleString()}`
      : "Not disclosed",
  description: job.description,
  mode: "External",
  experience: "",
  skills: "",
  jobCategory: "Private",
  postedAt: job.created || job.created_at || null,
  applyLink: job.redirect_url,
  source: "adzuna",
  country,
}));

setExternalJobs(formattedJobs);

localStorage.setItem(
  "externalJobs",
  JSON.stringify(formattedJobs)
);

  } catch (err) {
    console.log(err);
  }
};
  const countryNames = COUNTRY_NAMES;

  const internalJobMatchesCountry = (job) => {
    const jobCountry = String(job.country || job.country_code || "").toLowerCase();

    // International and EU-wide resources can be relevant regardless of the
    // visitor's selected country. Individual listings still link to the
    // official source so candidates can confirm eligibility.
    if (jobCountry === "global") return true;

    // Existing internal jobs were created for India before a country field existed.
    if (!jobCountry) return country === "in";

    return jobCountry === country || jobCountry.includes(countryNames[country]);
  };

  const isCountryWideJob = (job) => {
    const jobLocation = String(job.location || "").toLowerCase();
    const countryLocationNames = [
      countryNames[country],
      ...(country === "ae" ? ["united arab emirates"] : []),
      ...(country === "us" ? ["usa", "america"] : []),
    ];

    return countryLocationNames.some(
      (countryName) => countryName && jobLocation.includes(countryName)
    );
  };

  const governmentJobMatchesState = (job) => {
    const isGovernment = String(job.job_category || job.jobCategory || "").toLowerCase() === "government";
    if (!isGovernment) return true;
    const jobState = String(job.government_state || "national").toLowerCase();
    // National government roles remain available nationwide. State recruitment
    // is deliberately hidden until the visitor selects/matches that state.
    if (!jobState || jobState === "national") return true;
    return Boolean(locationFilter) && String(locationFilter).toLowerCase().includes(jobState);
  };

  const filteredJobs = Array.isArray(jobs)
  ? jobs
      .filter(internalJobMatchesCountry)
      .filter(governmentJobMatchesState)
      .filter((job) =>
        job.title.toLowerCase().includes(search.toLowerCase())
      )
      .filter((job) =>
        locationFilter
          ? String(job.location || "")
              .toLowerCase()
              .includes(locationFilter.toLowerCase()) || isCountryWideJob(job)
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
      .filter((job) =>
        jobCategoryFilter
          ? String(job.job_category || job.jobCategory || "").toLowerCase() === jobCategoryFilter.toLowerCase()
          : true
      )
   : [];

  const visibleExternalJobs = externalJobs.filter((job) => {
    const externalCountryMatch = job.source === "adzuna"
      ? job.country === country
      : String(job.location || "").toLowerCase().includes(countryNames[country] || "");
    const categoryMatch = jobCategoryFilter
      ? String(job.job_category || job.jobCategory || "").toLowerCase() === jobCategoryFilter.toLowerCase()
      : true;
    // External feeds do not provide reliable visa-sponsorship information, so they
    // must not appear when a user specifically asks for sponsored roles.
    const modeMatch = !modeFilter || job.mode === modeFilter;
    return externalCountryMatch && categoryMatch && modeMatch;
  });

  const getPostedTime = (job) => {
    const value = job.posted_at || job.postedAt || job.created_at || job.created;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
  };

  const getDeadlineTime = (job) => {
    const value = job.last_date || job.lastDate;
    const time = value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  };

  const allJobs = [...filteredJobs, ...visibleExternalJobs].sort((a, b) => {
    if (sortFilter === "oldest") return getPostedTime(a) - getPostedTime(b);
    if (sortFilter === "deadline") return getDeadlineTime(a) - getDeadlineTime(b);
    // All jobs at this point have already matched the selected search/filter
    // criteria, so a featured boost never pushes an unrelated job above results.
    if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
    return getPostedTime(b) - getPostedTime(a);
  });

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
  className={`min-h-screen overflow-x-hidden p-3 sm:p-6 md:p-10 transition-all duration-500 ${
    darkMode
      ? "bg-gray-900 text-white"
      : "bg-gradient-to-b from-gray-100 to-gray-200 text-black"
  }`}
>
      <JobNotificationPrompt />

     

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

    <div className="h-9 w-9 overflow-hidden rounded-lg bg-white md:h-11 md:w-11">
      <img
        src="/marketlence-mj-logo.png"
        alt="MJ - Marketlence Jobs logo"
        className="h-full max-w-none object-cover object-left"
      />
    </div>

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
    onClick={() => navigate(role === "employer" ? "/employer/dashboard" : "/profile")}
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
      {role === "employer" ? `${username || "Employer"} · Employer` : username}
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
    <button onClick={() => navigate("/employers")} className="px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]">
      For Employers
    </button>

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
      onClick={() => navigate(role === "employer" ? "/employer/dashboard" : "/dashboard")}
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
localStorage.removeItem("username");
localStorage.removeItem("email");
localStorage.removeItem("profilePic");
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
  onClick={() => navigate(role === "employer" ? "/employer/dashboard" : "/profile")}
  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]
  ${darkMode ? "text-gray-200" : "text-gray-700"}`}
>
  {role === "employer" ? "Employer Dashboard" : "Profile"}
</button>

      <button onClick={() => navigate(role === "employer" ? "/employer/dashboard" : "/dashboard")}
         className="px-4 py-2 rounded-xl font-medium transition-all duration-300 
  hover:bg-blue-600 hover:text-white hover:scale-105 
  hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
>
        {role === "employer" ? "Post & manage jobs" : "Dashboard"}
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
<div className="mx-auto mb-10 w-full max-w-7xl rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-center text-white shadow-2xl sm:mb-16 sm:rounded-3xl sm:p-10 md:p-20">

  <h1 className="text-3xl font-bold drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] sm:text-4xl md:text-6xl">
    Find Your Dream Job
  </h1>

  <p className="mt-4 text-base text-blue-100 sm:mt-5 sm:text-xl">
    Discover top opportunities from leading companies
  </p>

  <div className="mt-8 flex flex-col justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">

    <button
      onClick={() => {
        window.scrollTo({
          top: 700,
          behavior: "smooth"
        });
      }}
      className="w-full rounded-2xl border border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-blue-700 sm:w-auto md:px-8 md:py-4"
>
      Go to Jobs
    </button>

    <button
      onClick={() => {
        const role = localStorage.getItem("role");
        navigate(role === "employer" ? "/employer/post-job" : "/employer/register");
}}
      className="w-full rounded-2xl border border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-blue-700 sm:w-auto md:px-8 md:py-4"
>
      Post Job
    </button>

    <button
      onClick={() => navigate("/resume-builder")}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-blue-700 sm:w-auto md:px-8 md:py-4"
    >
      <FileText size={18} /> Build Resume
    </button>

    <button
      onClick={() => navigate("/document-generator")}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-blue-700 sm:w-auto md:px-8 md:py-4"
    >
      <FileText size={18} /> Docs Converter
    </button>

  </div>

</div>

{/* 🧭 Title */}
{!token && (
  <section className="mx-auto mb-10 flex w-full max-w-5xl flex-col items-center justify-between gap-5 rounded-2xl border border-blue-200 bg-white px-5 py-5 text-center shadow-lg shadow-blue-900/10 sm:flex-row sm:px-7 sm:text-left">
    <div className="flex items-center gap-4">
      <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><BellRing size={27} /></div>
      <div>
        <p className="text-lg font-bold text-slate-900">Get free job alerts made for you</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Save jobs, build your resume, and receive new opportunities by email.</p>
      </div>
    </div>
    <button onClick={() => navigate("/signup", { state: { source: "job-alerts" } })} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/30">
      <FileText size={18} /> Create free account
    </button>
  </section>
)}

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
<div className="xl:grid xl:grid-cols-[minmax(160px,1fr)_minmax(0,42rem)_minmax(160px,1fr)] xl:items-start xl:gap-6 mb-10">

  <div className="hidden xl:block pt-1">
    {location.pathname === "/" && <HomepageAd />}
  </div>

<div className="max-w-2xl mx-auto w-full relative">

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

  {userLocation && (
  <p className="text-green-600 font-medium mb-4">
    📍 Showing jobs near {userLocation}
  </p>
)}

<button
  onClick={async () => {
    setLocating(true);
    await getUserLocation();
    setLocating(false);
  }}
  disabled={locating}
  className={`
    px-5 py-3 rounded-xl font-semibold text-white
    transition-all duration-300
    ${
      locating
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
    }
  `}
>
  {locating ? "📡 Detecting Location..." : "📍 Use My Location"}
</button>

<EmploymentNews darkMode={darkMode} />

</div>

  <div className="hidden xl:block pt-1">
    {location.pathname === "/" && <HomepageAd />}
  </div>

</div>

<section className={`mx-auto mb-8 max-w-5xl rounded-2xl border p-4 shadow-sm ${darkMode ? "border-indigo-900 bg-slate-900" : "border-indigo-100 bg-indigo-50/70"}`}>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>🌍 Visa Jobs</h2>
      <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Find roles tagged for visa support, then check official work-visa guidance for your destination.</p>
    </div>
    <button
      type="button"
      onClick={() => setModeFilter("Visa")}
      className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
    >
      Show sponsored jobs
    </button>
  </div>
  <details className={`mt-4 rounded-xl border px-4 py-3 ${darkMode ? "border-slate-700 bg-slate-800" : "border-white bg-white"}`}>
    <summary className="cursor-pointer font-semibold text-indigo-700">Official work-visa and international-job resources ({VISA_SPONSORSHIP_RESOURCES.length})</summary>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {VISA_SPONSORSHIP_RESOURCES.map((resource) => (
        <a key={resource.country} href={resource.url} target="_blank" rel="noreferrer" className={`rounded-lg border px-3 py-2 text-sm transition hover:border-indigo-400 hover:text-indigo-700 ${darkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"}`}>
          <span className="block font-semibold">{resource.country}</span>
          <span className="block truncate text-xs opacity-80">{resource.name} ↗</span>
        </a>
      ))}
    </div>
  </details>
</section>

<div
  className={`mb-8 rounded-2xl border p-3 shadow-lg backdrop-blur-xl md:sticky md:top-24 md:z-40 ${
    darkMode
      ? "border-gray-700 bg-gray-900/95"
      : "border-white/80 bg-white/95"
  }`}
>
<div className="grid gap-4 md:grid-cols-6 xl:grid-cols-7">
<select
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  className={`w-full p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    darkMode
      ? "bg-gray-800 text-white border-gray-700"
      : "bg-white text-black border-gray-300"
  }`}
>
  {COUNTRIES.map(({ code, name }) => (
    <option key={code} value={code}>{name}</option>
  ))}
</select>

<div className="contents">

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
    <option value="Visa">Visa Jobs</option>
  </select>

  <select
    value={jobCategoryFilter}
    onChange={(e) => setJobCategoryFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      darkMode
        ? "bg-gray-800 text-white border-gray-700"
        : "bg-white text-black border-gray-300"
    }`}
  >
    <option value="">All sectors</option>
    <option value="Private">Private jobs</option>
    <option value="Government">Government jobs</option>
  </select>

  <select
    value={sortFilter}
    onChange={(e) => setSortFilter(e.target.value)}
    className={`p-4 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      darkMode
        ? "bg-gray-800 text-white border-gray-700"
        : "bg-white text-black border-gray-300"
    }`}
  >
    <option value="newest">Newest posted</option>
    <option value="oldest">Oldest posted</option>
    <option value="deadline">Closing soon</option>
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

</div>

      {/* 📋 Job List */}
      </div>

      <div className="mx-auto mt-10 w-full max-w-7xl">

       <FeaturedJobsSection placement="homepage" limit={8} location={locationFilter} category={jobCategoryFilter} query={search} />
       {allJobs.length === 0 ? (

          <p className="text-center text-gray-500">
            No jobs found
          </p>

        ) : (

          <div className="grid md:grid-cols-2 gap-8">

           {allJobs.map((job) => {
            const appId = localStorage.getItem(`app_${job.id}`);

  // ✅ DEBUG HERE (clean way)
  console.log("Job ID:", job.id);
  console.log("Is Saved:", savedJobs.includes(job.id));

  const completed = localStorage.getItem(`done_${job.id}`);
  const applicationEnabled = job.apply_enabled !== false && job.applyEnabled !== false;
  const lastDateLabel = job.last_date || job.lastDate || "Check job details";
  const postedValue = job.posted_at || job.postedAt || job.created_at || job.created;
  const postedDate = postedValue && !Number.isNaN(new Date(postedValue).getTime())
    ? new Date(postedValue).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Recently";

  return (
    <motion.div
     onClick={() => {
  if (job.is_featured) axios.post(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/featured-jobs/${job.id}/event`, { type: "click", placement: "search", visitorKey: sessionStorage.getItem("mlFeaturedVisitor") || "search" }).catch(() => {});
  navigate(`/jobs/${job.job_slug || job.id}`, { state: { job } });
}}
     key={`${job.source}-${job.id}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
       className={`relative rounded-2xl p-6 pt-20 shadow-lg flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl transition duration-500 ${job.is_featured ? "border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-violet-50 text-slate-900 shadow-amber-200/70" : darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
     >

      <div className="absolute left-4 top-4 -rotate-2 rounded-sm bg-amber-200 px-3 py-2 text-center text-xs font-bold text-amber-950 shadow-md ring-1 ring-amber-300">
        <span className="block uppercase tracking-wide">Posted</span>
        {postedDate}
      </div>
      {job.is_featured && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 px-3 py-1.5 text-xs font-black tracking-wide text-amber-950 shadow-lg shadow-amber-300/70">✦ PREMIUM FEATURED</span>}

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
  className={`mt-3 line-clamp-4 ${
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
<p className="mt-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
  Last date: {lastDateLabel}
</p>
                  </div>

                </div>

                {/* 🏷️ Tags */}
                <div className="flex gap-2 mt-4">

                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">
                    {job.type || "Full-time"}
                  </span>

                  <span className={`px-3 py-1 rounded-full text-xs ${job.mode === "Visa" ? "bg-violet-100 font-bold text-violet-700" : "bg-cyan-100 text-cyan-700"}`}>
                    {job.mode || "Onsite"}
                  </span>

                </div>

                {/* 🔘 Apply Button */}
               
{completed ? (
  <button className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-md shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_0_18px_rgba(16,185,129,0.65)]"
>
    Application Completed ✅
  </button>
) : appId ? (
  <button
    onClick={(e) => {
      e.stopPropagation();
      navigate(`/chatbot?applicationId=${appId}&jobId=${job.id}`);
    }}
    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-md shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_0_18px_rgba(59,130,246,0.7)]"
>
    Start Interview 🚀
  </button>
) : job.applyLink ? (
  <span className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-xl bg-green-600 px-4 py-3 font-bold text-white shadow-md shadow-green-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_0_18px_rgba(34,197,94,0.7)]">
    Apply on Company Website
  </span>
) : applicationEnabled ? (
  <span className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-md shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_0_18px_rgba(59,130,246,0.7)]"
>
    Check Details & Apply </span>
) : (
  <span className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-300">
    View Details — Applications Closed
  </span>
)}

                <button
                  onClick={(event) => shareJob(event, job)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500 py-2 font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white"
                >
                  <Share2 size={18} />
                  Share Job
                </button>

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
     body: JSON.stringify(
  job.source
    ? {
        user_id: userId,
        external_job_id: job.id,
        source: job.source,

        title: job.title,
        company: job.company,
        location: job.location
      }
    : {
        user_id: userId,
        job_id: job.id,
        source: "internal",

        title: job.title,
        company: job.company,
        location: job.location
      }
)
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
  <li>
    <button onClick={() => navigate("/")}>
      Home
    </button>
  </li>

  <li>
    <button onClick={() => navigate("/jobs")}>
      Jobs
    </button>
  </li>

  <li>
    <button onClick={() => navigate("/login")}>
      Login
    </button>
  </li>

  <li>
    <button onClick={() => navigate("/signup")}>
      Signup
    </button>
  </li>
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
