import ApplyForm from "../components/ApplyForm";
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const JOBS_API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs";

function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const applyFormRef = useRef(null);
  const [job, setJob] = useState(null);
  const [allJobs, setAllJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [jobCategory, setJobCategory] = useState("");

  useEffect(() => {
    axios
      .get(JOBS_API)
      .then((res) => {
        const internalJobs = Array.isArray(res.data) ? res.data : [];
        const externalJobs = JSON.parse(localStorage.getItem("externalJobs") || "[]");
        const jobs = [...internalJobs, ...externalJobs];
        setAllJobs(jobs);
        setJob(jobs.find((item) => String(item.id) === String(id)) || null);
      })
      .catch((error) => console.log(error));
  }, [id]);

  useEffect(() => {
    if (showForm && applyFormRef.current) {
      window.scrollTo({ top: applyFormRef.current.offsetTop - 80, behavior: "smooth" });
    }
  }, [showForm]);

  const relatedJobs = useMemo(() => {
    if (!job) return [];
    const currentCategory = String(job.job_category || job.jobCategory || "").toLowerCase();
    const currentLocation = String(job.location || "").toLowerCase();

    return allJobs
      .filter((item) => String(item.id) !== String(job.id))
      .map((item) => ({
        item,
        score:
          (currentCategory && String(item.job_category || item.jobCategory || "").toLowerCase() === currentCategory ? 2 : 0) +
          (currentLocation && String(item.location || "").toLowerCase() === currentLocation ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  }, [allJobs, job]);

  const openFilteredJobs = (event) => {
    event.preventDefault();
    localStorage.setItem("jobSearch", search);
    localStorage.setItem("jobLocation", locationFilter);
    localStorage.setItem("jobMode", modeFilter);
    localStorage.setItem("jobCategory", jobCategory);
    navigate("/jobs");
  };

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6">
        <p className="text-2xl font-bold text-gray-800">Job not found</p>
        <button onClick={() => navigate("/jobs")} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Back to Jobs</button>
      </div>
    );
  }

  const applicationsEnabled = job.apply_enabled !== false && job.applyEnabled !== false;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate("/jobs")} className="mb-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700">
          Back to Jobs
        </button>

        <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_280px]">
          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <h2 className="mb-4 text-lg font-bold text-gray-800">Find other jobs</h2>
            <form onSubmit={openFilteredJobs} className="space-y-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Job title or keyword" className="w-full rounded-xl border p-3" />
              <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location" className="w-full rounded-xl border p-3" />
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-full rounded-xl border p-3">
                <option value="">All modes</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} className="w-full rounded-xl border p-3">
                <option value="">All sectors</option>
                <option value="Private">Private jobs</option>
                <option value="Government">Government jobs</option>
              </select>
              <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">Search Jobs</button>
            </form>
          </aside>

          <main className="rounded-3xl bg-white p-6 shadow-xl md:p-10">
            <h1 className="break-words text-3xl font-bold text-gray-800 md:text-5xl">{job.title}</h1>
            <p className="mt-4 text-xl text-blue-600 md:text-2xl">{job.company}</p>
            <p className="mt-2 text-gray-500">Location: {job.location || "Not specified"}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <p><b>Salary:</b> {job.salary || "Not disclosed"}</p>
              <p><b>Experience:</b> {job.experience || "Not specified"}</p>
              <p><b>Skills:</b> {job.skills || "Not specified"}</p>
              <p><b>Type:</b> {job.type || "Not specified"}</p>
              <p><b>Mode:</b> {job.mode || "Not specified"}</p>
              {(job.job_category || job.jobCategory) && <p><b>Sector:</b> {job.job_category || job.jobCategory}</p>}
            </div>

            <div className="mt-10">
              <h2 className="mb-4 text-2xl font-bold">Job Description</h2>
              <p className="whitespace-pre-line leading-8 text-gray-700">{job.description || "No description available."}</p>
            </div>

            {job.applyLink ? (
              <button onClick={() => window.open(job.applyLink, "_blank", "noopener,noreferrer")} className="mt-8 inline-flex items-center justify-center rounded-xl bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700">
                Apply on Company Website
              </button>
            ) : applicationsEnabled ? (
              <button onClick={() => setShowForm(true)} className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 px-8 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:w-auto">
                Apply Now
              </button>
            ) : (
              <div className="mt-8 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 font-semibold text-amber-800">Applications are currently closed for this job.</div>
            )}

            {applicationsEnabled && showForm && <div ref={applyFormRef} className="mt-10"><ApplyForm job={job} /></div>}
          </main>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <h2 className="mb-4 text-lg font-bold text-gray-800">Similar jobs</h2>
            <div className="space-y-3">
              {relatedJobs.map((relatedJob) => (
                <button key={`${relatedJob.source || "internal"}-${relatedJob.id}`} onClick={() => navigate(`/jobs/${relatedJob.id}`)} className="w-full rounded-xl border p-4 text-left transition hover:border-blue-400 hover:bg-blue-50">
                  <p className="font-bold text-gray-800">{relatedJob.title}</p>
                  <p className="mt-1 text-sm text-blue-600">{relatedJob.company}</p>
                  <p className="mt-1 text-xs text-gray-500">{relatedJob.location}</p>
                </button>
              ))}
              {relatedJobs.length === 0 && <p className="text-sm text-gray-500">No similar jobs available yet.</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default JobDetails;
