import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const visitorKey = () => { let key = sessionStorage.getItem("mlFeaturedVisitor"); if (!key) { key = `${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem("mlFeaturedVisitor", key); } return key; };

export default function FeaturedJobsSection({ placement = "homepage", limit = 8, location = "", category = "", query = "", title, excludeId }) {
  const [jobs, setJobs] = useState([]); const sent = useRef(new Set()); const navigate = useNavigate();
  const headers = localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {};
  const event = (job, type) => { const key = `${job.id}:${type}`; if (type === "impression" && sent.current.has(key)) return; sent.current.add(key); axios.post(`${API}/featured-jobs/${job.id}/event`, { type, placement, visitorKey: visitorKey() }, { headers }).catch(() => {}); };
  useEffect(() => { axios.get(`${API}/featured-jobs`, { headers, params: { limit: Math.min(limit + 1, 10), location, category, query, visitorKey: visitorKey() } }).then((res) => { const visible = res.data.filter((job) => String(job.id) !== String(excludeId)).slice(0, limit); setJobs(visible); visible.forEach((job) => event(job, "impression")); }).catch(() => setJobs([])); }, [limit, location, category, query, excludeId]);
  if (!jobs.length) return null;
  return <section className="mx-auto mb-8 max-w-6xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900">{title || (localStorage.getItem("role") === "user" ? "Featured Jobs for You" : "Featured Jobs")}</h2><p className="mt-1 text-sm text-slate-600">Promoted openings from employers. Relevance still matters.</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{jobs.map((job) => <button key={job.id} onClick={() => { event(job, "click"); navigate(`/jobs/${job.job_slug || job.id}`); }} className="relative rounded-2xl border border-violet-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg"><span className="absolute right-4 top-4 rounded-full bg-violet-700 px-2 py-1 text-[10px] font-black tracking-wide text-white">FEATURED</span><h3 className="pr-16 text-lg font-black text-slate-900">{job.title}</h3><p className="mt-2 font-semibold text-blue-700">{job.company}</p><p className="mt-1 text-sm text-slate-600">{job.location}</p><p className="mt-3 line-clamp-2 text-sm text-slate-600">{job.description}</p></button>)}</div></section>;
}
