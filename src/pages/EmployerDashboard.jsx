import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import FeaturedJobPurchase from "../components/FeaturedJobPurchase";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [featureJob, setFeatureJob] = useState(null);
  const [choosingFeaturedJob, setChoosingFeaturedJob] = useState(false);
  const load = () => Promise.all([axios.get(`${API}/employer/dashboard`, auth()), axios.get(`${API}/employer/notifications`, auth())]).then(([dashboard, notificationResponse]) => { setData(dashboard.data); setNotifications(notificationResponse.data || []); }).catch(() => navigate("/employer/login"));
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
  const pendingFeaturePayments = liveJobs.filter((job) => job.feature_requested_plan && !job.is_featured);
  const unreadNotifications = notifications.filter((notification) => !notification.read_at);
  const openNotificationPayment = async (notification) => {
    const job = liveJobs.find((item) => String(item.id) === String(notification.job_id));
    if (job) setFeatureJob(job);
    try { await axios.patch(`${API}/employer/notifications/${notification.id}/read`, {}, auth()); setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)); } catch {}
  };
  useEffect(() => {
    const requestedJobId = searchParams.get("payment_job");
    const job = requestedJobId && liveJobs.find((item) => String(item.id) === String(requestedJobId) && item.feature_requested_plan && !item.is_featured);
    if (job) setFeatureJob(job);
  }, [data, searchParams]);
  const chooseFeaturedJob = () => {
    if (!liveJobs.length) return toast("Post a job first. It can be featured after it is approved and live.");
    if (liveJobs.length === 1) return setFeatureJob(liveJobs[0]);
    setChoosingFeaturedJob(true);
  };

  return <main className="min-h-screen bg-slate-100 p-5 md:p-9"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><button onClick={() => navigate("/")} className="text-sm font-bold text-blue-700">← MarketLence Jobs</button><h1 className="mt-2 text-3xl font-black">Employer dashboard</h1></div><button onClick={() => navigate("/employer/profile")} className="rounded-xl border bg-white px-4 py-3 font-bold">Company profile</button></div>
    <section className="mt-6 grid gap-4 md:grid-cols-3"><a href="/employer/post-job?featured=featured_11" className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700"><p className="text-sm font-bold text-blue-100">CREATE A VACANCY</p><h2 className="mt-1 text-2xl font-black">+ Post a Job</h2><p className="mt-2 text-sm text-blue-100">Start a free listing or upgrade it below.</p></a><button onClick={() => navigate("/employer/post-job?featured=featured_11")} className="rounded-2xl bg-violet-700 p-6 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-800"><p className="text-sm font-bold text-violet-100">PREMIUM VISIBILITY</p><h2 className="mt-1 text-2xl font-black">★ Post Featured Job</h2><p className="mt-2 text-sm text-violet-100">Opens the form with the 11-day featured promotion selected.</p></button><a href="/employer/applications" className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"><p className="text-sm font-bold text-slate-300">CANDIDATE MANAGEMENT</p><h2 className="mt-1 text-2xl font-black">Manage applications</h2><p className="mt-2 text-sm text-slate-300">Review, request documents and message candidates.</p></a></section>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{statCards.map(([label, number]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{number || 0}</p></div>)}</div>
    {unreadNotifications.length > 0 && <section className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex items-center gap-2"><span className="text-xl">🔔</span><h2 className="text-lg font-black text-slate-900">Notifications</h2><span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white">{unreadNotifications.length}</span></div><div className="mt-4 space-y-3">{unreadNotifications.map((notification) => <div key={notification.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"><div><p className="font-black text-slate-900">{notification.title}</p><p className="mt-1 text-sm text-slate-600">{notification.message}</p></div>{notification.job_id && <button onClick={() => openNotificationPayment(notification)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">View action</button>}</div>)}</div></section>}
    {pendingFeaturePayments.length > 0 && <section className="mt-7 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-700 to-indigo-700 p-6 text-white shadow-lg"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-black tracking-wider text-violet-200">PAYMENT ACTION REQUIRED</p><h2 className="mt-1 text-2xl font-black">Your featured job is approved</h2><p className="mt-2 max-w-2xl text-sm text-violet-100">Complete secure Razorpay payment to activate premium placement. Your job becomes featured only after successful payment.</p></div><span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{pendingFeaturePayments.length} ready</span></div><div className="mt-5 grid gap-3">{pendingFeaturePayments.map((job) => { const is29Days = job.feature_requested_plan === "featured_29"; return <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 text-slate-900"><div><p className="font-black">{job.title}</p><p className="mt-1 text-sm text-slate-600">{is29Days ? "29 days" : "11 days"} featured placement · {is29Days ? "₹499" : "₹299"}</p></div><button onClick={() => setFeatureJob(job)} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-800">Complete payment →</button></div>; })}</div></section>}
    <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-black">Your job posts</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Job</th><th>Location</th><th>Status</th><th>Views</th><th>Apply clicks</th><th>Actions</th></tr></thead><tbody>{(data?.jobs || []).map((job) => <tr key={job.id} className="border-t"><td className="p-4"><b>{job.title}</b><br/><span className="text-xs text-slate-500">{job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "—"}</span>{job.feature_requested_plan && !job.is_featured && <p className="mt-1 text-xs font-bold text-violet-700">★ Feature requested: {job.feature_requested_plan === "featured_29" ? "29 days" : "11 days"}</p>}</td><td>{job.location}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{job.employer_status}</span></td><td>{job.views_count || 0}</td><td>{job.apply_clicks || 0}</td><td className="space-x-2 p-3"><a href={`/employer/post-job?edit=${job.id}`} className="font-bold text-blue-700">Edit</a>{job.employer_status === "Live" && !job.is_featured && <button onClick={() => setFeatureJob(job)} className="font-bold text-violet-700">{job.feature_requested_plan ? "Complete payment" : "Feature"}</button>}<button onClick={() => action(job.id, "Paused")} className="font-bold text-amber-700">Pause</button><button onClick={() => action(job.id, "Closed")} className="font-bold text-slate-700">Close</button><button onClick={() => action(job.id, "delete")} className="font-bold text-red-600">Delete</button></td></tr>)}{!data?.jobs?.length && <tr><td colSpan="6" className="p-10 text-center text-slate-500">No jobs yet. Post your first vacancy.</td></tr>}</tbody></table></div></section>
  </div>{choosingFeaturedJob && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-700">FEATURE A JOB</p><h2 className="text-2xl font-black">Choose a live job</h2></div><button onClick={() => setChoosingFeaturedJob(false)} className="text-xl text-slate-500">×</button></div><div className="mt-5 space-y-3">{liveJobs.map((job) => <button key={job.id} onClick={() => { setChoosingFeaturedJob(false); setFeatureJob(job); }} className="w-full rounded-xl border p-4 text-left transition hover:border-violet-600 hover:bg-violet-50"><p className="font-bold">{job.title}</p><p className="mt-1 text-sm text-slate-600">{job.location}</p></button>)}</div></div></div>}{featureJob && <FeaturedJobPurchase job={featureJob} onDone={load} onClose={() => setFeatureJob(null)} />}</main>;
}
