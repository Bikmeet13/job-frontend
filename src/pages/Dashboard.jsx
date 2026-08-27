import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import FeaturedJobsSection from "../components/FeaturedJobsSection";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const stages = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected"];
const colours = { Applied: "bg-blue-600", "Under Review": "bg-amber-500", Shortlisted: "bg-violet-600", "Interview Scheduled": "bg-indigo-600", "Interview Completed": "bg-teal-600", Selected: "bg-emerald-600", "Not Selected": "bg-rose-600", Withdrawn: "bg-slate-500" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ saved: 0, applied: 0 });
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState({});
  const [openWorkspace, setOpenWorkspace] = useState(null);
  const [reply, setReply] = useState("");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    if (!token) return navigate("/login");
    try {
      const [applicationsRes, statsRes] = await Promise.all([
        axios.get(`${API}/applications`, { headers }),
        axios.get(`${API}/dashboard-stats/${localStorage.getItem("userId") || "me"}`, { headers }),
      ]);
      setApplications(applicationsRes.data || []);
      setStats(statsRes.data || {});
    } catch (error) { toast.error(error.response?.data?.error || "Could not load your application tracker."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const loadWorkspace = async (applicationId) => { try { const { data } = await axios.get(`${API}/applications/${applicationId}/workspace`, { headers }); setWorkspace((current) => ({ ...current, [applicationId]: data })); setOpenWorkspace((current) => current === applicationId ? null : applicationId); } catch (error) { toast.error(error.response?.data?.error || "Could not load application messages."); } };
  const uploadDocument = async (applicationId, requestId, file) => { if (!file) return; try { const data = new FormData(); data.append("document", file); await axios.post(`${API}/applications/${applicationId}/documents/${requestId}`, data, { headers: { ...headers, "Content-Type": "multipart/form-data" } }); toast.success("Document uploaded."); loadWorkspace(applicationId); } catch (error) { toast.error(error.response?.data?.error || "Could not upload document."); } };
  const sendReply = async (applicationId) => { if (!reply.trim()) return; try { await axios.post(`${API}/applications/${applicationId}/messages`, { body: reply }, { headers }); setReply(""); loadWorkspace(applicationId); } catch (error) { toast.error(error.response?.data?.error || "Could not send message."); } };

  const withdraw = async (application) => {
    if (!window.confirm(`Withdraw your application for ${application.title}?`)) return;
    try {
      const result = await axios.delete(`${API}/applications/${application.id}`, { headers });
      setApplications((items) => items.map((item) => item.id === application.id ? { ...item, status: result.data.status, updated_at: new Date().toISOString() } : item));
      toast.success("Application withdrawn.");
    } catch (error) { toast.error(error.response?.data?.error || "Could not withdraw this application."); }
  };

  const active = applications.filter((app) => !["Withdrawn", "Not Selected"].includes(app.status || "Applied")).length;
  const interviews = applications.filter((app) => ["Interview Scheduled", "Interview Completed"].includes(app.status)).length;
  const displayDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

  return <main className="min-h-screen bg-slate-100 p-4 md:p-8"><div className="mx-auto max-w-6xl">
    <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shadow-xl md:p-10"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-center"><div><h1 className="text-3xl font-black md:text-5xl">Your job journey</h1><p className="mt-3 text-blue-100">Follow every application update in one place.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/saved-jobs")} className="rounded-xl bg-white/15 px-4 py-2 font-bold hover:bg-white/25">Saved jobs</button><button onClick={() => navigate("/resume-builder")} className="rounded-xl bg-cyan-500 px-4 py-2 font-bold hover:bg-cyan-400">Build resume</button><button onClick={() => navigate("/candidate/job-alerts")} className="rounded-xl bg-violet-500 px-4 py-2 font-bold hover:bg-violet-400">Job alerts</button><button onClick={() => navigate("/jobs")} className="rounded-xl bg-white px-4 py-2 font-bold text-blue-800">Find jobs</button></div></div></section>

    <section className="mt-6 grid gap-4 sm:grid-cols-3">{[[stats.applied || applications.length, "Applications", "text-blue-600"], [active, "Active applications", "text-violet-600"], [interviews, "Interviews", "text-emerald-600"]].map(([value, label, colour]) => <div key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className={`text-4xl font-black ${colour}`}>{value}</p><p className="mt-2 text-slate-500">{label}</p></div>)}</section>

    <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">Application tracker</h2><p className="mt-1 text-sm text-slate-500">Employers and Marketlence admins update your progress here.</p></div><button onClick={() => navigate("/jobs")} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">Browse jobs</button></div>
      {loading ? <p className="py-12 text-center text-slate-500">Loading your applications…</p> : !applications.length ? <div className="py-12 text-center"><p className="text-lg font-bold text-slate-800">No applications yet</p><p className="mt-2 text-slate-500">Find a role you like and apply with your resume.</p></div> : <div className="mt-6 space-y-5">{applications.map((app) => {
        const status = app.status || "Applied"; const currentStage = stages.indexOf(status); const isClosed = ["Withdrawn", "Not Selected"].includes(status);
        return <article key={app.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="text-xl font-black text-slate-900">{app.title}</h3><p className="mt-1 text-slate-600">{app.company}</p><p className="mt-2 text-sm text-slate-500">Applied {displayDate(app.created_at)} · Updated {displayDate(app.updated_at)}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-sm font-bold text-white ${colours[status] || "bg-slate-600"}`}>{status}</span></div>
          {!isClosed && <div className="mt-5 grid grid-cols-5 gap-1">{stages.map((stage, index) => <div key={stage} className="min-w-0 text-center"><div className={`mx-auto h-2.5 rounded-full ${index <= currentStage ? "bg-blue-600" : "bg-slate-200"}`} /><p className={`mt-2 text-[10px] font-semibold leading-tight sm:text-xs ${index <= currentStage ? "text-blue-700" : "text-slate-400"}`}>{stage}</p></div>)}</div>}
          {app.status_note && <p className="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><b>Update:</b> {app.status_note}</p>}
          <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => navigate(`/jobs/${app.jobid || app.job_id}`)} className="rounded-lg border border-blue-200 px-4 py-2 font-bold text-blue-700 hover:bg-blue-50">View job</button><button onClick={() => loadWorkspace(app.id)} className="rounded-lg border border-violet-200 px-4 py-2 font-bold text-violet-700 hover:bg-violet-50">Messages & documents</button>{!isClosed && <button onClick={() => withdraw(app)} className="rounded-lg border border-rose-200 px-4 py-2 font-bold text-rose-700 hover:bg-rose-50">Withdraw application</button>}</div>
          {openWorkspace === app.id && <section className="mt-5 rounded-2xl bg-slate-50 p-4"><h4 className="font-black text-slate-900">Employer requests</h4>{workspace[app.id]?.documents?.length ? <div className="mt-3 space-y-2">{workspace[app.id].documents.map((document) => <div key={document.id} className="rounded-xl bg-white p-3 text-sm"><b>{document.document_name}</b> · {document.status}{document.note && <p className="mt-1 text-slate-600">{document.note}</p>}{document.status === "requested" && <label className="mt-2 inline-block cursor-pointer rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Upload document<input type="file" className="hidden" onChange={(event) => uploadDocument(app.id, document.id, event.target.files?.[0])}/></label>}{document.file_url && <a href={document.file_url} target="_blank" rel="noreferrer" className="ml-2 font-bold text-blue-700 underline">View upload</a>}</div>)}</div> : <p className="mt-2 text-sm text-slate-500">No documents have been requested.</p>}<h4 className="mt-5 font-black text-slate-900">Messages</h4><div className="mt-2 space-y-2">{workspace[app.id]?.messages?.map((message) => <div key={message.id} className={`rounded-xl p-3 text-sm ${message.sender_role === "candidate" ? "ml-8 bg-blue-100" : "mr-8 bg-white"}`}><b>{message.sender_role === "candidate" ? "You" : "Employer"}</b><p className="mt-1 whitespace-pre-wrap">{message.body}</p></div>)}{!workspace[app.id]?.messages?.length && <p className="text-sm text-slate-500">No messages yet.</p>}</div><div className="mt-3 flex gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to employer" className="min-h-20 flex-1 rounded-xl border p-3"/><button onClick={() => sendReply(app.id)} className="h-fit rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Send</button></div></section>}
        </article>;
      })}</div>}</section>
    <div className="mt-8"><FeaturedJobsSection placement="candidate-dashboard" limit={6} title="Featured jobs for you" /></div>
  </div></main>;
}
