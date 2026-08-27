import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import FeaturedJobPurchase from "../components/FeaturedJobPurchase";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [featureJob, setFeatureJob] = useState(null);
  const [choosingFeaturedJob, setChoosingFeaturedJob] = useState(false);
  const load = () => axios.get(`${API}/employer/dashboard`, auth()).then((response) => setData(response.data)).catch(() => navigate("/employer/login"));
  useEffect(() => { load(); }, []);

  const action = async (id, kind) => {
    if (kind === "delete" && !window.confirm("Delete this job permanently?")) return;
    try {
      if (kind === "delete") await axios.delete(`${API}/employer/jobs/${id}`, auth());
      else await axios.patch(`${API}/employer/jobs/${id}/status`, { status: kind }, auth());
      toast.success("Job updated");
      load();
    } catch (error) { toast.error(error.response?.data?.error || "Could not update job"); }
  };

  const stats = data?.stats || {};
  const statCards = [["Total jobs", stats.total_jobs], ["Live", stats.live_jobs], ["Pending review", stats.pending_jobs], ["Closed", stats.closed_jobs], ["Apply clicks", stats.total_apply_clicks]];
  const liveJobs = (data?.jobs || []).filter((job) => job.employer_status === "Live");
  const chooseFeaturedJob = () => {
    if (!liveJobs.length) return toast("Post a job first. It can be featured after it is approved and live.");
    if (liveJobs.length === 1) return setFeatureJob(liveJobs[0]);
    setChoosingFeaturedJob(true);
  };

  return <main className="min-h-screen bg-slate-100 p-5 md:p-9"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><button onClick={() => navigate("/")} className="text-sm font-bold text-blue-700">← MarketLence Jobs</button><h1 className="mt-2 text-3xl font-black">Employer dashboard</h1></div><button onClick={() => navigate("/employer/profile")} className="rounded-xl border bg-white px-4 py-3 font-bold">Company profile</button></div>
    <section className="mt-6 grid gap-4 md:grid-cols-2"><a href="/employer/post-job" className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700"><p className="text-sm font-bold text-blue-100">CREATE A VACANCY</p><h2 className="mt-1 text-2xl font-black">+ Post a Job</h2><p className="mt-2 text-sm text-blue-100">Reach candidates with a new job listing.</p></a><button onClick={chooseFeaturedJob} className="rounded-2xl bg-violet-700 p-6 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-800"><p className="text-sm font-bold text-violet-100">GET MORE VISIBILITY</p><h2 className="mt-1 text-2xl font-black">★ Feature a Job</h2><p className="mt-2 text-sm text-violet-100">Promote an approved live job at the top of the portal.</p></button></section>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{statCards.map(([label, number]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{number || 0}</p></div>)}</div>
    <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-black">Your job posts</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Job</th><th>Location</th><th>Status</th><th>Views</th><th>Apply clicks</th><th>Actions</th></tr></thead><tbody>{(data?.jobs || []).map((job) => <tr key={job.id} className="border-t"><td className="p-4"><b>{job.title}</b><br/><span className="text-xs text-slate-500">{job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "—"}</span></td><td>{job.location}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{job.employer_status}</span></td><td>{job.views_count || 0}</td><td>{job.apply_clicks || 0}</td><td className="space-x-2 p-3"><a href={`/employer/post-job?edit=${job.id}`} className="font-bold text-blue-700">Edit</a>{job.employer_status === "Live" && <button onClick={() => setFeatureJob(job)} className="font-bold text-violet-700">Feature</button>}<button onClick={() => action(job.id, "Paused")} className="font-bold text-amber-700">Pause</button><button onClick={() => action(job.id, "Closed")} className="font-bold text-slate-700">Close</button><button onClick={() => action(job.id, "delete")} className="font-bold text-red-600">Delete</button></td></tr>)}{!data?.jobs?.length && <tr><td colSpan="6" className="p-10 text-center text-slate-500">No jobs yet. Post your first vacancy.</td></tr>}</tbody></table></div></section>
  </div>{choosingFeaturedJob && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-700">FEATURE A JOB</p><h2 className="text-2xl font-black">Choose a live job</h2></div><button onClick={() => setChoosingFeaturedJob(false)} className="text-xl text-slate-500">×</button></div><div className="mt-5 space-y-3">{liveJobs.map((job) => <button key={job.id} onClick={() => { setChoosingFeaturedJob(false); setFeatureJob(job); }} className="w-full rounded-xl border p-4 text-left transition hover:border-violet-600 hover:bg-violet-50"><p className="font-bold">{job.title}</p><p className="mt-1 text-sm text-slate-600">{job.location}</p></button>)}</div></div></div>}{featureJob && <FeaturedJobPurchase job={featureJob} onDone={load} onClose={() => setFeatureJob(null)} />}</main>;
}
