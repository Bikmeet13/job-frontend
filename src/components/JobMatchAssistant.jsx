import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const scanSteps = [
  "Reading your profile signals…",
  "Comparing your skills with live openings…",
  "Finding your strongest opportunities…",
];

const words = (value = "") => String(value).toLowerCase().split(/[,/|\s]+/).map((item) => item.trim()).filter((item) => item.length > 2);

function rankJobs(jobs, skills) {
  const terms = words(skills);
  return [...jobs]
    .map((job) => ({
      ...job,
      matchScore: Math.min(98, 54 + terms.reduce((score, term) => score + (String(job.skills || "").toLowerCase().includes(term) ? 11 : 0) + (String(job.title || "").toLowerCase().includes(term) ? 7 : 0), 0)),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

export default function JobMatchAssistant() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState("");

  const sessionKey = useMemo(() => `ml-match-assistant-${userId || "guest"}`, [userId]);

  const findMatches = async () => {
    setScanning(true);
    setStep(0);
    try {
      const profile = userId ? await axios.get(`${API}/profile/${userId}`) : { data: {} };
      const profileSkills = profile.data?.skills || "";
      setSkills(profileSkills);
      const jobsResponse = profileSkills.trim()
        ? await axios.get(`${API}/recommended-jobs/${encodeURIComponent(profileSkills)}`)
        : await axios.get(`${API}/jobs`);
      const found = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
      setJobs(rankJobs(found, profileSkills));
    } catch {
      setJobs([]);
    } finally {
      window.setTimeout(() => setScanning(false), 2200);
    }
  };

  useEffect(() => {
    if (!token || role !== "user") return undefined;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "shown");
      setOpen(true);
      findMatches();
    }
    return undefined;
  // The signed-in identity is captured on mount; re-scanning is user initiated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!scanning) return undefined;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % scanSteps.length), 850);
    return () => window.clearInterval(timer);
  }, [scanning]);

  if (!token || role !== "user") return null;

  const openAssistant = () => {
    setOpen(true);
    if (!jobs.length && !scanning) findMatches();
  };

  return <div className="fixed left-4 top-[92px] z-[60] sm:left-6 md:left-10 md:top-[124px]">
    <button type="button" onClick={openAssistant} className="match-assistant-orb group" aria-label="Open job match assistant">
      <span className="match-assistant-galaxy"><span/><span/><span/></span>
      <Sparkles size={18} className="relative z-10 text-white drop-shadow" />
    </button>

    {open && <section className="match-assistant-panel animate-fadeIn" aria-label="Your job match assistant">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="match-assistant-mini"><Sparkles size={14}/></span><div><p className="font-black text-slate-900">Match Assistant</p><p className="text-xs text-slate-500">Your personal job discovery guide</p></div></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close assistant"><X size={18}/></button>
      </div>

      {scanning ? <div className="mt-5 rounded-2xl border border-white/70 bg-white/55 p-4 text-center"><div className="match-assistant-scan mx-auto"><span/></div><p className="mt-4 text-sm font-bold text-slate-800">Finding jobs most matching your profile</p><p className="mt-2 min-h-5 text-xs text-indigo-600">{scanSteps[step]}</p></div> : jobs.length ? <div className="mt-4"><p className="text-xs font-bold text-slate-500">{skills ? `Matched using ${words(skills).slice(0, 3).join(", ")}` : "Fresh opportunities picked for you"}</p><div className="mt-3 space-y-2">{jobs.map((job) => <button type="button" key={`${job.source || "job"}-${job.id}`} onClick={() => navigate(`/jobs/${job.job_slug || job.id}`, { state: { job } })} className="w-full rounded-xl border border-white/80 bg-white/65 p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white"><div className="flex gap-2"><span className="mt-0.5 rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-700">{job.matchScore}%</span><div className="min-w-0"><p className="line-clamp-1 text-sm font-black text-slate-800">{job.title}</p><p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{job.company} · {job.location}</p></div></div></button>)}</div><button type="button" onClick={() => { setOpen(false); navigate("/profile"); }} className="mt-4 text-xs font-bold text-indigo-700 hover:text-indigo-900">Improve matches by updating your profile →</button></div> : <div className="mt-5 rounded-2xl border border-white/70 bg-white/55 p-4"><p className="font-bold text-slate-800">Let’s build your match profile</p><p className="mt-1 text-xs leading-5 text-slate-600">Add skills and experience to your profile, then I’ll find stronger job matches for you.</p><button type="button" onClick={() => { setOpen(false); navigate("/profile"); }} className="mt-3 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700">Complete profile</button></div>}
    </section>}
  </div>;
}
