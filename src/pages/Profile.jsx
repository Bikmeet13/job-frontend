import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { ArrowRight, BriefcaseBusiness, Check, CircleUserRound, FileText, GraduationCap, Lightbulb, Pencil, Sparkles, Upload, WandSparkles } from "lucide-react";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";

function DetailCard({ icon: Icon, title, value, accent, empty, isEditing, onChange, placeholder }) {
  return <section className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/65 sm:p-6">
    <div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${accent}`}><Icon size={19} /></span><div><h2 className="font-bold text-slate-900 dark:text-white">{title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">Strengthen your career story</p></div></div>
    {isEditing ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows="4" className="profile-input min-h-28 resize-y" /> : <p className={`whitespace-pre-line text-sm leading-6 ${value ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>{value || empty}</p>}
  </section>;
}

function Profile() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState({ name: localStorage.getItem("username") || "Marketlence Candidate", email: localStorage.getItem("email") || "", bio: localStorage.getItem("bio") || "" });
  const [skills, setSkills] = useState(localStorage.getItem("skills") || "");
  const [education, setEducation] = useState(localStorage.getItem("education") || "");
  const [experience, setExperience] = useState(localStorage.getItem("experience") || "");
  const [projects, setProjects] = useState(localStorage.getItem("projects") || "");
  const [profileImage, setProfileImage] = useState(null);
  const [resume, setResume] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(localStorage.getItem("profilePic") || "");
  const [uploadedResume, setUploadedResume] = useState(localStorage.getItem("resume") || "");
  const [uploading, setUploading] = useState(false);
  const [loaderText, setLoaderText] = useState("");
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const skillList = useMemo(() => skills.split(",").map((skill) => skill.trim()).filter(Boolean), [skills]);
  const completion = useMemo(() => Math.round(([user.bio, skills, education, experience, projects, uploadedResume, uploadedImage].filter(Boolean).length / 7) * 100), [user.bio, skills, education, experience, projects, uploadedResume, uploadedImage]);
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase() || "ML";

  useEffect(() => {
    if (!userId) return;
    axios.get(`${API}/profile/${userId}`).then(({ data }) => {
      setSkills(data.skills || ""); setEducation(data.education || ""); setExperience(data.experience || ""); setProjects(data.projects || "");
      setUploadedImage(data.profile_pic || localStorage.getItem("profilePic") || ""); setUploadedResume(data.resume_url || localStorage.getItem("resume") || "");
    }).catch(() => {});
  }, [userId]);
  useEffect(() => {
    if (!skills.trim()) { setRecommendedJobs([]); return; }
    fetch(`${API}/recommended-jobs/${encodeURIComponent(skills)}`).then((response) => response.ok ? response.json() : []).then((data) => setRecommendedJobs(Array.isArray(data) ? data.slice(0, 3) : [])).catch(() => setRecommendedJobs([]));
  }, [skills]);

  const uploadFile = async (type) => {
    const file = type === "image" ? profileImage : resume;
    if (!file) { toast.error(`Choose a ${type === "image" ? "photo" : "resume"} first`); return; }
    setUploading(true); setLoaderText(type === "image" ? "Polishing your profile photo..." : "Securing your resume...");
    try {
      const formData = new FormData(); formData.append(type === "image" ? "image" : "resume", file);
      const response = await fetch(`${API}/${type === "image" ? "upload-image" : "upload-resume"}`, { method: "POST", body: formData }); const data = await response.json();
      if (!response.ok || !data.file) throw new Error("Upload failed");
      if (type === "image") { setUploadedImage(data.file); localStorage.setItem("profilePic", data.file); } else { setUploadedResume(data.file); localStorage.setItem("resume", data.file); }
      toast.success(type === "image" ? "Profile photo updated" : "Resume uploaded");
    } catch { toast.error("Upload failed. Please try again."); } finally { setUploading(false); }
  };
  const analyzeResume = async () => {
    if (!resume) { toast.error("Select your resume, then use auto-fill"); return; }
    setUploading(true); setLoaderText("Reading your resume and preparing your career profile...");
    try {
      const formData = new FormData(); formData.append("resume", resume); const response = await fetch(`${API}/extract-resume`, { method: "POST", body: formData }); const data = await response.json(); if (!response.ok) throw new Error("Analysis failed");
      if (data.skills) setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : data.skills); if (data.education) setEducation(data.education); if (data.experience) setExperience(data.experience); if (data.projects) setProjects(Array.isArray(data.projects) ? data.projects.join("\n") : data.projects);
      setIsEditing(true); toast.success("Profile details extracted — review and save them");
    } catch { toast.error("We couldn't analyze that resume. Please fill in your details."); } finally { setUploading(false); }
  };
  const saveProfile = async () => {
    try {
      await axios.put(`${API}/profile`, { userId, bio: user.bio, skills, education, experience, projects, profilePic: uploadedImage, resume: uploadedResume });
      Object.entries({ username: user.name, email: user.email, bio: user.bio, skills, education, experience, projects }).forEach(([key, value]) => localStorage.setItem(key, value));
      setIsEditing(false); toast.success("Career profile saved");
    } catch { toast.error("Save failed. Please try again."); }
  };

  return <main className="profile-shell min-h-screen px-4 pb-14 pt-8 sm:px-6 lg:px-10">
    {uploading && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-5 backdrop-blur-md"><div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900"><div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /><h2 className="text-xl font-bold">Working on it</h2><p className="mt-2 text-sm text-slate-500">{loaderText}</p></div></div>}
    <div className="profile-ambient" aria-hidden="true" /><div className="relative mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 dark:text-slate-300"><ArrowRight className="rotate-180" size={17} /> Back to jobs</button><div className="flex gap-2"><button onClick={() => navigate("/saved-jobs")} className="profile-quiet-button">Saved jobs</button><button onClick={() => setIsEditing((value) => !value)} className="profile-primary-button"><Pencil size={16} /> {isEditing ? "Close editor" : "Edit profile"}</button></div></div>
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75"><div className="profile-cover relative min-h-32" /><div className="relative -mt-12 px-5 pb-6 sm:px-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="profile-avatar shrink-0">{uploadedImage ? <img src={uploadedImage} onError={(event) => { event.currentTarget.style.display = "none"; }} alt="Profile" /> : initials}<span className="profile-online-dot" /></div><div className="pb-1">{isEditing ? <input value={user.name} onChange={(event) => setUser({ ...user, name: event.target.value })} className="profile-name-input" aria-label="Name" /> : <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{user.name}</h1>}{isEditing ? <input value={user.email} onChange={(event) => setUser({ ...user, email: event.target.value })} className="profile-email-input" type="email" aria-label="Email" /> : <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email || "Add your email address"}</p>}<span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"><CircleUserRound size={14} /> {role === "admin" || role === "superadmin" ? "Platform administrator" : "Job seeker profile"}</span></div></div><div className="profile-completion-card"><div className="profile-progress" style={{ "--profile-progress": `${completion * 3.6}deg` }}><span>{completion}%</span></div><div><b>Profile strength</b><p>{completion < 80 ? "Add details to stand out" : "Looking excellent"}</p></div></div></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 dark:border-white/10 sm:grid-cols-4"><div className="profile-stat"><b>{skillList.length}</b><span>Skills</span></div><div className="profile-stat"><b>{experience ? "Ready" : "—"}</b><span>Experience</span></div><div className="profile-stat"><b>{uploadedResume ? "Added" : "Needed"}</b><span>Resume</span></div><div className="profile-stat"><b>{recommendedJobs.length}</b><span>Job matches</span></div></div></div></section>
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px]"><div className="space-y-7"><section className="profile-glass-card p-5 sm:p-7"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="profile-eyebrow"><Sparkles size={15} /> Career snapshot</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Your professional introduction</h2></div>{!isEditing && <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-indigo-600 hover:underline">Add details</button>}</div>{isEditing ? <textarea value={user.bio} onChange={(event) => setUser({ ...user, bio: event.target.value })} rows="4" className="profile-input" placeholder="Tell employers what you do best, your goals, and the opportunities you seek." /> : <p className={`max-w-3xl whitespace-pre-line text-sm leading-7 ${user.bio ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>{user.bio || "Introduce yourself to employers. A clear snapshot gives your profile more credibility."}</p>}</section><section className="profile-glass-card p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="profile-eyebrow"><Lightbulb size={15} /> Core strengths</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Skills employers can find</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/10">{skillList.length} listed</span></div>{isEditing ? <textarea value={skills} onChange={(event) => setSkills(event.target.value)} className="profile-input" placeholder="e.g. Sales, Negotiation, Excel, Customer Success" rows="3" /> : <div className="flex flex-wrap gap-2">{skillList.length ? skillList.map((skill) => <span key={skill} className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">{skill}</span>) : <p className="text-sm text-slate-400">Add skills to receive stronger job matches.</p>}</div>}</section><div className="grid gap-5 md:grid-cols-2"><DetailCard icon={BriefcaseBusiness} title="Experience" value={experience} onChange={setExperience} isEditing={isEditing} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" empty="Add your work experience, internships, or meaningful responsibilities." placeholder="e.g. Sales Executive · Acme Ltd · 2024–Present" /><DetailCard icon={GraduationCap} title="Education" value={education} onChange={setEducation} isEditing={isEditing} accent="bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" empty="Add your degree, institution, certifications, or training." placeholder="e.g. B.Com · Kurukshetra University · 2023" /><DetailCard icon={WandSparkles} title="Projects & achievements" value={projects} onChange={setProjects} isEditing={isEditing} accent="bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" empty="Show projects, portfolio work, awards, or achievements." placeholder="Describe your strongest projects or achievements." /></div>{isEditing && <div className="flex flex-wrap justify-end gap-3"><button onClick={() => setIsEditing(false)} className="profile-quiet-button">Cancel</button><button onClick={saveProfile} className="profile-primary-button"><Check size={17} /> Save career profile</button></div>}</div>
      <aside className="space-y-5"><section className="profile-glass-card overflow-hidden"><div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75"><FileText size={15} /> Resume centre</p><h2 className="mt-2 text-xl font-black">Put your best work forward.</h2><p className="mt-2 text-sm leading-6 text-white/80">Upload your resume, then turn it into a more complete profile.</p></div><div className="p-5"><label className="profile-file-label"><Upload size={17} /> <span>{resume?.name || "Choose resume"}</span><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResume(event.target.files?.[0] || null)} /></label><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => uploadFile("resume")} className="profile-quiet-button justify-center text-xs">Upload</button><button onClick={analyzeResume} className="profile-primary-button justify-center text-xs"><WandSparkles size={14} /> Auto-fill</button></div>{uploadedResume && <a href={uploadedResume} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline"><FileText size={16} /> View current resume <ArrowRight size={15} /></a>}</div></section><section className="profile-glass-card p-5"><p className="profile-eyebrow"><CircleUserRound size={15} /> Profile photo</p><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">A clear photo makes your profile feel more complete.</p><label className="profile-file-label mt-4"><Upload size={17} /> <span>{profileImage?.name || "Choose photo"}</span><input type="file" accept="image/*" onChange={(event) => setProfileImage(event.target.files?.[0] || null)} /></label><button onClick={() => uploadFile("image")} className="profile-quiet-button mt-3 w-full justify-center text-xs">Update photo</button></section><section className="profile-glass-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="profile-eyebrow"><Sparkles size={15} /> Your matches</p><h2 className="mt-1 font-black text-slate-900 dark:text-white">Recommended roles</h2></div><button onClick={() => navigate("/jobs")} className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-400/10" aria-label="View jobs"><ArrowRight size={17} /></button></div><div className="mt-4 space-y-3">{recommendedJobs.length ? recommendedJobs.map((job) => <button key={job.id} onClick={() => navigate(`/job/${job.id}`)} className="group w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5"><b className="line-clamp-1 text-sm text-slate-800 group-hover:text-indigo-700 dark:text-white">{job.title}</b><p className="mt-1 line-clamp-1 text-xs text-slate-500">{job.company || "Marketlence opportunity"}</p></button>) : <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500 dark:bg-white/5">Add a few skills and we’ll surface roles that fit your profile.</div>}</div></section>{(role === "admin" || role === "superadmin") && <button onClick={() => navigate("/admin")} className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-left text-white shadow-lg transition hover:-translate-y-0.5 dark:bg-indigo-600"><span><b className="block">Admin workspace</b><small className="text-white/70">Manage the platform</small></span><ArrowRight size={20} /></button>}</aside></div>
    </div>
  </main>;
}

export default Profile;
