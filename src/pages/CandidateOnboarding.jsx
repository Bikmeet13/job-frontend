import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { trackSignupFunnel } from "../utils/signupTracking";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const field = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ preferredTitles: "", preferredLocations: "", experience: "", workModes: "", jobTypes: "Full-time", emailEnabled: true, frequency: "daily" });

  useEffect(() => { trackSignupFunnel("signup_onboarding_view", { account_type: "candidate" }); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const complete = async (event) => {
    event.preventDefault();
    if (!form.preferredTitles.trim()) return toast.error("Tell us at least one job title or skill.");
    setBusy(true);
    try {
      await axios.put(`${API}/candidate/job-alerts`, form, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      localStorage.setItem("jobSearch", form.preferredTitles.trim());
      localStorage.setItem("jobLocation", form.preferredLocations.trim().split(",")[0].trim());
      localStorage.setItem("jobMode", form.workModes);
      localStorage.setItem("jobExperience", form.experience);
      localStorage.setItem("jobCategory", "Private");
      trackSignupFunnel("signup_onboarding_complete", { account_type: "candidate", alerts_enabled: form.emailEnabled });
      navigate("/jobs?matched=1", { replace: true });
    } catch (error) { toast.error(error.response?.data?.error || "Could not save your preferences. Please try again."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_35%),radial-gradient(circle_at_bottom_right,_#e0e7ff,_transparent_42%),#f8fafc] p-4 sm:p-8"><div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-[.82fr_1.18fr]"><aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-8 text-white sm:p-12"><div className="absolute -left-16 top-10 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl"/><div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl"/><div className="relative"><p className="text-xs font-black tracking-[.2em] text-cyan-300">MARKETLENCE JOBS</p><h1 className="mt-5 text-4xl font-black leading-tight">Let’s find work that fits you.</h1><p className="mt-5 max-w-sm leading-7 text-blue-100">Two quick answers help us show suitable opportunities and send only relevant job alerts.</p><ol className="mt-10 space-y-5 text-sm font-bold text-slate-100"><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 font-black text-slate-950">1</span>Tell us the work you want</li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15">2</span>Choose location and work style</li><li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15">3</span>See your matching jobs</li></ol></div></aside><section className="p-7 sm:p-12"><p className="text-sm font-black tracking-wider text-blue-700">WELCOME TO MARKETLENCE</p><h2 className="mt-3 text-3xl font-black text-slate-950">Personalise your job search</h2><p className="mt-3 text-slate-600">You can update these choices anytime from Job alerts.</p><form onSubmit={complete} className="mt-8 space-y-5"><label className="block text-sm font-bold text-slate-700">What roles are you looking for?<span className="text-rose-600"> *</span><input required name="preferredTitles" value={form.preferredTitles} onChange={update} className={`mt-2 ${field}`} placeholder="e.g. Sales Executive, React Developer"/></label><label className="block text-sm font-bold text-slate-700">Preferred location<input name="preferredLocations" value={form.preferredLocations} onChange={update} className={`mt-2 ${field}`} placeholder="e.g. Karnal, Haryana"/></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Experience<select name="experience" value={form.experience} onChange={update} className={`mt-2 ${field}`}><option value="">Any experience</option><option value="Fresher">Fresher</option><option value="1">1+ years</option><option value="2">2+ years</option><option value="3">3+ years</option><option value="5">5+ years</option><option value="10">10+ years</option></select></label><label className="block text-sm font-bold text-slate-700">Work style<select name="workModes" value={form.workModes} onChange={update} className={`mt-2 ${field}`}><option value="">Any work style</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option><option value="Onsite">Onsite</option></select></label></div><label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700"><input className="mt-1 h-4 w-4" type="checkbox" name="emailEnabled" checked={form.emailEnabled} onChange={update}/><span><b className="text-slate-900">Send relevant job alerts by email</b><br/>You can change the frequency or unsubscribe anytime.</span></label><button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Finding your matches…" : "Show my matching jobs →"}</button><button type="button" onClick={() => navigate("/jobs?matched=1", { replace: true })} className="w-full text-sm font-bold text-slate-500 transition hover:text-blue-700">Skip for now</button></form></section></div></main>;
}
