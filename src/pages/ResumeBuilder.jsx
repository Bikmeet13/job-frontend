import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileText, Mic, MicOff, Upload } from "lucide-react";

const DRAFT_KEY = "marketlenceResumeDraft";
const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api/resume-builder/import";
const palettes = [
  ["#2563eb", "#eff6ff"], ["#0f766e", "#f0fdfa"], ["#7c3aed", "#f5f3ff"],
  ["#be123c", "#fff1f2"], ["#b45309", "#fffbeb"], ["#334155", "#f8fafc"],
  ["#047857", "#ecfdf5"], ["#4338ca", "#eef2ff"], ["#c2410c", "#fff7ed"],
];
const templateTitles = ["Classic", "Executive", "Modern", "Minimal", "Bold", "Elegant", "Professional", "Clean", "Creative", "Career", "Smart", "Signature"];
const templates = Array.from({ length: 111 }, (_, index) => ({
  id: index + 1,
  name: `${templateTitles[index % templateTitles.length]} ${String(index + 1).padStart(3, "0")}`,
  color: palettes[index % palettes.length][0],
  soft: palettes[index % palettes.length][1],
  layout: index % 3,
}));

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
function textLines(value) { return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean); }
function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }

function ResumeBuilder() {
  const navigate = useNavigate();
  const draft = loadDraft();
  const [resume, setResume] = useState({
    fullName: draft.fullName || localStorage.getItem("username") || "", email: draft.email || localStorage.getItem("email") || "",
    phone: draft.phone || "", location: draft.location || "", summary: draft.summary || localStorage.getItem("bio") || "",
    skills: draft.skills || localStorage.getItem("skills") || "", experience: draft.experience || localStorage.getItem("experience") || "", education: draft.education || localStorage.getItem("education") || "",
  });
  const [templateId, setTemplateId] = useState(draft.templateId || 1);
  const [listeningTo, setListeningTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);
  const template = templates.find((item) => item.id === Number(templateId)) || templates[0];

  const updateField = (event) => setResume((current) => ({ ...current, [event.target.name]: event.target.value }));
  const saveDraft = () => { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...resume, templateId })); toast.success("Resume draft saved"); };

  const startVoice = (field) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return toast.error("Voice typing is supported in Chrome or Edge. Please use one of those browsers.");
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListeningTo(field);
    recognition.onresult = (event) => setResume((current) => ({ ...current, [field]: `${current[field] ? `${current[field]} ` : ""}${event.results[0][0].transcript}` }));
    recognition.onerror = () => toast.error("Voice typing could not start. Please allow microphone access.");
    recognition.onend = () => setListeningTo("");
    recognition.start();
  };

  const importDocument = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData(); form.append("document", file);
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not read this file.");
      if (data.extracted && Object.keys(data.extracted).length) setResume((current) => ({ ...current, ...Object.fromEntries(Object.entries(data.extracted).filter(([, value]) => value)) }));
      else setResume((current) => ({ ...current, summary: data.text }));
      toast.success("Your resume details have been added. Please check and edit them.");
    } catch (error) { toast.error(error.message); } finally { setUploading(false); }
  };

  const downloadPdf = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return toast.error("Please allow pop-ups to download your resume.");
    const section = (title, body) => body ? `<section><h2>${title}</h2>${body}</section>` : "";
    const list = (value) => `<ul>${textLines(value).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
    const skills = String(resume.skills || "").split(",").map((item) => item.trim()).filter(Boolean).map((item) => `<span class="skill">${escapeHtml(item)}</span>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(resume.fullName || "Marketlence Resume")}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:45px}h1,h2{color:${template.color}}h1{font-size:32px;margin:0 0 7px}.contact{color:#64748b;margin-bottom:22px}h2{border-bottom:2px solid ${template.soft};font-size:14px;letter-spacing:.08em;margin:24px 0 9px;padding-bottom:7px;text-transform:uppercase}p,li{font-size:14px;line-height:1.6}ul{margin:0;padding-left:20px}.skill{background:${template.soft};border-radius:12px;color:${template.color};display:inline-block;font-size:12px;margin:0 6px 6px 0;padding:5px 9px}@media print{body{padding:28px}}</style></head><body><h1>${escapeHtml(resume.fullName || "Your Name")}</h1><div class="contact">${[resume.email,resume.phone,resume.location].filter(Boolean).map(escapeHtml).join(" &nbsp;|&nbsp; ")}</div>${section("Professional Summary", `<p>${escapeHtml(resume.summary)}</p>`)}${section("Skills", skills)}${section("Experience", list(resume.experience))}${section("Education", list(resume.education))}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
  const voice = (field) => <button type="button" aria-label={`Speak ${field}`} onClick={() => startVoice(field)} className={`absolute right-2 top-8 rounded-lg p-2 ${listeningTo === field ? "bg-rose-100 text-rose-600" : "text-blue-600 hover:bg-blue-50"}`}>{listeningTo === field ? <MicOff size={18} /> : <Mic size={18} />}</button>;

  return <div className="min-h-screen bg-slate-100 px-4 py-7 md:px-10"><div className="mx-auto max-w-7xl">
    <button onClick={() => navigate(-1)} className="mb-5 rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">&larr; Back</button>
    <header className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-xl md:p-9"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Marketlence Jobs</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">Interactive Resume Builder</h1><p className="mt-2 max-w-2xl text-blue-50">Choose a design first, then write, speak, or upload an existing resume to build a polished PDF.</p></header>

    <section className="mt-7 rounded-3xl bg-white p-5 shadow-lg md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Step 1 of 2</p><h2 className="text-2xl font-bold text-slate-900">Choose one of 111 templates</h2></div><span className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: template.soft, color: template.color }}>{template.name} selected</span></div>
      <div className="mt-5 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">{templates.map((item) => <button key={item.id} onClick={() => setTemplateId(item.id)} className={`rounded-xl border-2 p-2 text-left transition hover:-translate-y-0.5 ${item.id === template.id ? "border-slate-800 shadow-md" : "border-transparent bg-slate-50 hover:border-slate-200"}`}><div className="h-16 rounded-lg p-2" style={{ background: item.soft }}><div className="h-2 w-2/3 rounded" style={{ background: item.color }} /><div className="mt-2 h-1.5 w-full rounded bg-white" /><div className="mt-1 h-1.5 w-4/5 rounded bg-white" /><div className="mt-3 h-3 rounded" style={{ background: item.color, opacity: .18 }} /></div><p className="mt-2 truncate text-xs font-bold text-slate-700">{item.name}</p></button>)}</div>
    </section>

    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_0.9fr]"><section className="rounded-3xl bg-white p-6 shadow-lg md:p-8"><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Step 2 of 2</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Add your information</h2>
      <div className="mt-5 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-bold text-slate-800">Build from an existing file</p><p className="mt-1 text-sm text-slate-600">Upload PDF, Word (.docx), text, JPG, or PNG. We will fill the form for you.</p></div><button type="button" onClick={() => uploadRef.current?.click()} disabled={uploading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"><Upload size={18} /> {uploading ? "Reading file..." : "Upload resume"}</button><input ref={uploadRef} onChange={importDocument} type="file" accept=".pdf,.docx,.txt,image/png,image/jpeg" className="hidden" /></div></div>
      <p className="mt-5 text-sm text-slate-500"><Mic size={15} className="mr-1 inline" /> Tap a microphone beside any field to speak your answer.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="relative text-sm font-semibold text-slate-700">Full name<input name="fullName" value={resume.fullName} onChange={updateField} className={fieldClass} placeholder="Your full name" />{voice("fullName")}</label><label className="relative text-sm font-semibold text-slate-700">Phone<input name="phone" value={resume.phone} onChange={updateField} className={fieldClass} placeholder="+91 ..." />{voice("phone")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Email<input name="email" type="email" value={resume.email} onChange={updateField} className={fieldClass} placeholder="you@email.com" />{voice("email")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Location<input name="location" value={resume.location} onChange={updateField} className={fieldClass} placeholder="City, State, Country" />{voice("location")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Professional summary<textarea name="summary" value={resume.summary} onChange={updateField} className={fieldClass} rows="4" placeholder="Briefly describe your strengths and career goals." />{voice("summary")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Skills <span className="font-normal text-slate-400">(separate with commas)</span><textarea name="skills" value={resume.skills} onChange={updateField} className={fieldClass} rows="3" placeholder="React, Communication, Sales" />{voice("skills")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Experience <span className="font-normal text-slate-400">(one achievement per line)</span><textarea name="experience" value={resume.experience} onChange={updateField} className={fieldClass} rows="5" placeholder="Software Developer, ABC Ltd — 2023 to Present" />{voice("experience")}</label><label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">Education <span className="font-normal text-slate-400">(one entry per line)</span><textarea name="education" value={resume.education} onChange={updateField} className={fieldClass} rows="4" placeholder="B.Tech Computer Science, University Name — 2023" />{voice("education")}</label></div>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={saveDraft} className="rounded-xl border border-blue-600 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50">Save draft</button><button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white shadow-md transition hover:brightness-95" style={{ background: template.color }}><FileText size={18} /> Download as PDF</button></div>
    </section>
    <section className="rounded-3xl bg-slate-200 p-4 shadow-inner md:p-6"><p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Live preview · {template.name}</p><div className={`min-h-full bg-white p-7 shadow-xl md:p-10 ${template.layout === 1 ? "border-t-8" : template.layout === 2 ? "border-l-8" : ""}`} style={{ borderColor: template.color }}><h2 className="text-3xl font-bold" style={{ color: template.color }}>{resume.fullName || "Your Name"}</h2><p className="mt-2 text-sm text-slate-500">{[resume.email, resume.phone, resume.location].filter(Boolean).join(" | ") || "Email | Phone | Location"}</p>{[["Professional Summary", resume.summary, false], ["Skills", resume.skills, true], ["Experience", resume.experience, false], ["Education", resume.education, false]].map(([title, value, isSkills]) => value && <div key={title} className="mt-7"><h3 className="border-b-2 pb-2 text-sm font-bold uppercase tracking-wider" style={{ borderColor: template.soft, color: template.color }}>{title}</h3>{isSkills ? <div className="mt-3 flex flex-wrap gap-2">{String(value).split(",").filter(Boolean).map((skill) => <span key={skill} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: template.soft, color: template.color }}>{skill.trim()}</span>)}</div> : title === "Professional Summary" ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{value}</p> : <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{textLines(value).map((line) => <li key={line}>{line}</li>)}</ul>}</div>)}</div></section>
    </div></div></div>;
}

export default ResumeBuilder;
