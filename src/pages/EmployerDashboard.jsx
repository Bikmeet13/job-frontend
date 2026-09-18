import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, Bell, BriefcaseBusiness, Building2, ChevronRight, CirclePlus, FileCheck2, LayoutDashboard, LoaderCircle, Pause, Sparkles, UsersRound } from "lucide-react";
import FeaturedJobPurchase from "../components/FeaturedJobPurchase";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const statusStyle = (status) => ({ Live: "bg-emerald-50 text-emerald-700 ring-emerald-200", "Pending Review": "bg-amber-50 text-amber-700 ring-amber-200", Paused: "bg-slate-100 text-slate-600 ring-slate-200", Closed: "bg-rose-50 text-rose-700 ring-rose-200" }[status] || "bg-slate-100 text-slate-600 ring-slate-200");

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({});
  const [hrOverview, setHrOverview] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [featureJob, setFeatureJob] = useState(null);
  const [choosingFeaturedJob, setChoosingFeaturedJob] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dashboard, notificationResponse, profileResponse, hrResponse] = await Promise.all([
        axios.get(`${API}/employer/dashboard`, auth()), axios.get(`${API}/employer/notifications`, auth()),
        axios.get(`${API}/employer/profile`, auth()), axios.get(`${API}/employer/hr/overview`, auth()),
      ]);
      setData(dashboard.data); setNotifications(notificationResponse.data || []); setProfile(profileResponse.data || {}); setHrOverview(hrResponse.data || null);
    } catch { navigate("/employer/login", { replace: true }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const updateJob = async (id, kind) => {
    if (kind === "delete" && !window.confirm("Delete this job permanently?")) return;
    try {
      if (kind === "delete") await axios.delete(`${API}/employer/jobs/${id}`, auth());
      else await axios.patch(`${API}/employer/jobs/${id}/status`, { status: kind }, auth());
      toast.success(kind === "delete" ? "Job deleted" : "Job updated"); load();
    } catch (error) { toast.error(error.response?.data?.error || "Could not update job"); }
  };

  const jobs = data?.jobs || [];
  const stats = data?.stats || {};
  const liveJobs = jobs.filter((job) => job.employer_status === "Live");
  const pendingFeaturePayments = liveJobs.filter((job) => job.feature_requested_plan && !job.is_featured);
  const unreadNotifications = notifications.filter((notification) => !notification.read_at);
  const totalViews = Number(stats.total_views || 0);
  const totalClicks = Number(stats.total_apply_clicks || 0);
  const clickRate = totalViews ? Math.round((totalClicks / totalViews) * 100) : 0;
  const companyName = profile.company_name || "Your organization";
  const companyInitials = companyName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "HR";

  const openNotification = async (notification) => {
    const job = liveJobs.find((item) => String(item.id) === String(notification.job_id));
    if (job?.feature_requested_plan && !job.is_featured) setFeatureJob(job);
    try { await axios.patch(`${API}/employer/notifications/${notification.id}/read`, {}, auth()); setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)); } catch {}
  };
  useEffect(() => {
    const id = searchParams.get("payment_job");
    const job = id && liveJobs.find((item) => String(item.id) === String(id) && item.feature_requested_plan && !item.is_featured);
    if (job) setFeatureJob(job);
  }, [data, searchParams]);
  const selectFeatureJob = () => { if (!liveJobs.length) return toast("Post a job first. It can be featured after approval."); if (liveJobs.length === 1) return setFeatureJob(liveJobs[0]); setChoosingFeaturedJob(true); };

  const metrics = [
    { label: "Active hiring", value: stats.live_jobs || 0, note: "Live openings", icon: BriefcaseBusiness, tone: "indigo" },
    { label: "Talent pool", value: hrOverview?.employees?.active || 0, note: "Active employees", icon: UsersRound, tone: "cyan" },
    { label: "Recruiter reach", value: totalViews, note: "Job views", icon: BarChart3, tone: "violet" },
    { label: "Action required", value: (stats.pending_jobs || 0) + (hrOverview?.leave?.pending || 0), note: "Jobs & leave requests", icon: FileCheck2, tone: "amber" },
  ];

  return <main className="employer-os min-h-screen text-slate-800">
    <aside className="employer-sidebar"><button onClick={() => navigate("/")} className="employer-brand"><span className="employer-brand-mark">MJ</span><span>MarketLence<br/><b>People</b></span></button><nav><button className="employer-nav-active"><LayoutDashboard size={19}/> Overview</button><button onClick={() => navigate("/employer/applications")}><UsersRound size={19}/> Talent inbox</button><button onClick={() => navigate("/employer/hr")}><Building2 size={19}/> People hub</button><button onClick={() => navigate("/employer/profile")}><Building2 size={19}/> Organization</button></nav><div className="employer-sidebar-bottom"><p>WORKSPACE</p><button onClick={() => navigate("/employer/profile")} className="employer-company-mini"><span>{companyInitials}</span><b>{companyName}</b><ChevronRight size={16}/></button></div></aside>
    <section className="employer-content">
      <header className="employer-topbar"><div><p className="employer-overline">PEOPLE OPERATIONS</p><h1>Good to see you, <span>{profile.full_name?.split(" ")[0] || "there"}.</span></h1><p className="employer-subtitle">Here is the pulse of {companyName} today.</p></div><div className="flex flex-wrap items-center gap-3"><button onClick={load} className="employer-icon-button" title="Refresh workspace">↻</button><button onClick={() => navigate("/employer/profile")} className="employer-avatar">{profile.logo_url ? <img src={profile.logo_url} alt="" /> : companyInitials}</button><button onClick={() => navigate("/employer/post-job")} className="employer-create-button"><CirclePlus size={18}/> Post a job</button></div></header>
      {loading ? <div className="employer-loading"><LoaderCircle className="animate-spin"/> Loading your workspace…</div> : <>
        <section className="employer-hero"><div><p className="employer-overline text-indigo-100">WORKFORCE COMMAND CENTRE</p><h2>Hire smarter.<br/>Manage people better.</h2><p>One secure place for recruiting, people operations, approvals, and growth.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => navigate("/employer/post-job")} className="employer-hero-primary"><CirclePlus size={17}/> Create opening</button><button onClick={() => navigate("/employer/hr")} className="employer-hero-secondary">Open People Hub <ChevronRight size={17}/></button></div></div><div className="employer-hero-insight"><span className="employer-pulse-dot"/><p>Hiring health</p><b>{clickRate}%</b><small>application click rate</small><div><i style={{ width: `${Math.min(Math.max(clickRate, 5), 100)}%` }}/></div><span>{totalClicks} clicks from {totalViews} views</span></div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className={`employer-metric employer-metric-${tone}`}><div><p>{label}</p><b>{value}</b><small>{note}</small></div><span><Icon size={22}/></span></article>)}</section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,.75fr)]"><article className="employer-panel"><div className="employer-panel-heading"><div><p className="employer-overline">RECRUITMENT</p><h2>Hiring pipeline</h2></div><button onClick={() => navigate("/employer/applications")}>View candidates <ChevronRight size={16}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><button onClick={() => navigate("/employer/post-job")} className="employer-action-card"><span className="bg-indigo-100 text-indigo-700"><CirclePlus size={20}/></span><b>Post an opening</b><p>Publish a new vacancy for review.</p></button><button onClick={() => navigate("/employer/applications")} className="employer-action-card"><span className="bg-violet-100 text-violet-700"><UsersRound size={20}/></span><b>Review talent</b><p>Screen applicants and continue conversations.</p></button><button onClick={selectFeatureJob} className="employer-action-card"><span className="bg-amber-100 text-amber-700"><Sparkles size={20}/></span><b>Boost visibility</b><p>Feature a live job to reach more talent.</p></button></div><div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Recent openings</h3><span className="text-xs font-bold text-slate-400">{jobs.length} total</span></div><div className="mt-3 space-y-2">{jobs.slice(0, 4).map((job) => <div key={job.id} className="employer-job-row"><div className="employer-job-icon"><BriefcaseBusiness size={18}/></div><div className="min-w-0 flex-1"><b>{job.title}</b><p>{job.location || "Location not set"} · {job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "Recently added"}</p></div><span className={`employer-status ${statusStyle(job.employer_status)}`}>{job.employer_status}</span><button onClick={() => navigate(`/employer/post-job?edit=${job.id}`)} className="employer-row-link">Manage</button></div>)}{!jobs.length && <div className="employer-empty">Your openings will appear here. Start by creating your first role.</div>}</div></div></article>
          <aside className="space-y-6"><article className="employer-panel"><div className="employer-panel-heading"><div><p className="employer-overline">TODAY</p><h2>Priority centre</h2></div><span className="employer-notification-count">{unreadNotifications.length + pendingFeaturePayments.length + (hrOverview?.leave?.pending || 0)}</span></div><div className="mt-4 space-y-3">{pendingFeaturePayments.map((job) => <button key={job.id} onClick={() => setFeatureJob(job)} className="employer-priority"><span className="bg-violet-100 text-violet-700"><Sparkles size={17}/></span><div><b>Activate featured job</b><p>{job.title}</p></div><ChevronRight size={17}/></button>)}{(hrOverview?.leave?.pending || 0) > 0 && <button onClick={() => navigate("/employer/hr")} className="employer-priority"><span className="bg-amber-100 text-amber-700"><FileCheck2 size={17}/></span><div><b>Leave approvals waiting</b><p>{hrOverview.leave.pending} request{hrOverview.leave.pending === 1 ? "" : "s"} need review</p></div><ChevronRight size={17}/></button>}{unreadNotifications.slice(0, 3).map((item) => <button key={item.id} onClick={() => openNotification(item)} className="employer-priority"><span className="bg-sky-100 text-sky-700"><Bell size={17}/></span><div><b>{item.title}</b><p>{item.message}</p></div><ChevronRight size={17}/></button>)}{!pendingFeaturePayments.length && !(hrOverview?.leave?.pending) && !unreadNotifications.length && <div className="employer-clear-state"><span>✓</span><b>You’re all caught up</b><p>No approvals or tasks need attention.</p></div>}</div></article><article className="employer-panel employer-people-card"><div><p className="employer-overline text-cyan-700">PEOPLE HUB</p><h2>Build a stronger workplace.</h2><p>Manage employees, leave requests, and secure HR documents in one place.</p><button onClick={() => navigate("/employer/hr")}>Manage people <ChevronRight size={16}/></button></div><UsersRound size={58}/></article></aside></section>
      </>}
    </section>
    {choosingFeaturedJob && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="employer-overline">PREMIUM VISIBILITY</p><h2 className="text-2xl font-black">Choose a live job</h2></div><button onClick={() => setChoosingFeaturedJob(false)} className="text-2xl text-slate-400">×</button></div><div className="mt-5 space-y-3">{liveJobs.map((job) => <button key={job.id} onClick={() => { setChoosingFeaturedJob(false); setFeatureJob(job); }} className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-400 hover:bg-violet-50"><b>{job.title}</b><p className="mt-1 text-sm text-slate-500">{job.location}</p></button>)}</div></div></div>}
    {featureJob && <FeaturedJobPurchase job={featureJob} onDone={load} onClose={() => setFeatureJob(null)} />}
  </main>;
}
