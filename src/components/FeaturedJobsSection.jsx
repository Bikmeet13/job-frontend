import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CompanyLogo from "./CompanyLogo";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const visitorKey = () => { let key = sessionStorage.getItem("mlFeaturedVisitor"); if (!key) { key = `${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem("mlFeaturedVisitor", key); } return key; };

export default function FeaturedJobsSection({ placement = "homepage", limit = 8, location = "", country = "", countryName = "", category = "", query = "", title, excludeId }) {
  const [jobs, setJobs] = useState([]); const sent = useRef(new Set()); const navigate = useNavigate();
  const headers = localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {};
  const event = (job, type) => { const key = `${job.id}:${type}`; if (type === "impression" && sent.current.has(key)) return; sent.current.add(key); axios.post(`${API}/featured-jobs/${job.id}/event`, { type, placement, visitorKey: visitorKey() }, { headers }).catch(() => {}); };
  useEffect(() => { axios.get(`${API}/featured-jobs`, { headers, params: { limit: Math.min(limit + 1, 10), location, country, countryName, category, query, visitorKey: visitorKey() } }).then((res) => {
    const selectedLocation = String(location || "").trim().toLowerCase();
    const selectedCountry = String(country || "").trim().toLowerCase();
    const selectedCountryName = String(countryName || "").trim().toLowerCase();
    const visible = res.data.filter((job) => {
      if (String(job.id) === String(excludeId)) return false;
      const jobLocation = String(job.location || "").toLowerCase();
      const jobCountry = String(job.country || "").toLowerCase();
      if (selectedLocation) return jobLocation.includes(selectedLocation);
      return !selectedCountry || jobCountry === selectedCountry || jobLocation.includes(selectedCountryName) || (selectedCountry === "in" && !jobCountry);
    }).slice(0, limit);
    setJobs(visible); visible.forEach((job) => event(job, "impression"));
  }).catch(() => setJobs([])); }, [limit, location, country, countryName, category, query, excludeId]);
  if (!jobs.length) return null;
  return <section className="mx-auto mb-8 max-w-6xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900">{title || (localStorage.getItem("role") === "user" ? "Featured Jobs for You" : "Featured Jobs")}</h2><p className="mt-1 text-sm text-slate-600">Promoted openings from employers. Relevance still matters.</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{jobs.map((job) => <button key={job.id} onClick={() => { event(job, "click"); navigate(`/jobs/${job.job_slug || job.id}`); }} className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-100 p-5 text-left shadow-lg shadow-amber-200/70 transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-violet-600"/><span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 px-3 py-1.5 text-[10px] font-black tracking-wider text-amber-950 shadow-md shadow-amber-300/80">✦ PREMIUM</span><div className="mt-2 flex items-center gap-3 pr-20"><CompanyLogo job={job} className="h-11 w-11 shrink-0 rounded-xl shadow-sm"/><p className="text-[10px] font-black tracking-[0.18em] text-violet-700">FEATURED OPPORTUNITY</p></div><h3 className="mt-3 pr-2 text-lg font-black text-slate-900">{job.title}</h3><p className="mt-2 font-semibold text-blue-700">{job.company}</p><p className="mt-1 text-sm text-slate-600">{job.location}</p><p className="mt-3 line-clamp-2 text-sm text-slate-600">{job.description}</p></button>)}</div></section>;
}
