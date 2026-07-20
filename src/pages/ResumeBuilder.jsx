import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const DRAFT_KEY = "marketlenceResumeDraft";

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textLines(value) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function ResumeBuilder() {
  const navigate = useNavigate();
  const draft = loadDraft();
  const [resume, setResume] = useState({
    fullName: draft.fullName || localStorage.getItem("username") || "",
    email: draft.email || localStorage.getItem("email") || "",
    phone: draft.phone || "",
    location: draft.location || "",
    summary: draft.summary || localStorage.getItem("bio") || "",
    skills: draft.skills || localStorage.getItem("skills") || "",
    experience: draft.experience || localStorage.getItem("experience") || "",
    education: draft.education || localStorage.getItem("education") || "",
  });

  const updateField = (event) => setResume((current) => ({ ...current, [event.target.name]: event.target.value }));
  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(resume));
    toast.success("Resume draft saved");
  };

  const downloadPdf = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return toast.error("Please allow pop-ups to download your resume.");

    const skills = resume.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const section = (title, content) => content ? `<section><h2>${title}</h2>${content}</section>` : "";
    const lineList = (value) => textLines(value).map((line) => `<li>${escapeHtml(line)}</li>`).join("");

    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(resume.fullName || "Marketlence Resume")}</title><style>
      *{box-sizing:border-box} body{color:#172033;font-family:Arial,sans-serif;margin:0;padding:48px} h1{color:#1468d4;font-size:30px;margin:0 0 8px}.contact{color:#536075;margin-bottom:26px}h2{border-bottom:2px solid #d7e7ff;color:#1468d4;font-size:15px;letter-spacing:.08em;margin:25px 0 10px;padding-bottom:7px;text-transform:uppercase}p,li{font-size:14px;line-height:1.6}ul{margin:0;padding-left:20px}.skills{display:flex;flex-wrap:wrap;gap:7px}.skill{background:#eaf3ff;border-radius:12px;color:#145bb4;font-size:12px;padding:5px 9px}@media print{body{padding:28px}}
      </style></head><body><h1>${escapeHtml(resume.fullName || "Your Name")}</h1><div class="contact">${[resume.email, resume.phone, resume.location].filter(Boolean).map(escapeHtml).join(" &nbsp;|&nbsp; ")}</div>${section("Professional Summary", `<p>${escapeHtml(resume.summary)}</p>`)}${section("Skills", `<div class="skills">${skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}</div>`)}${section("Experience", `<ul>${lineList(resume.experience)}</ul>`)}${section("Education", `<ul>${lineList(resume.education)}</ul>`)}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return <div className="min-h-screen bg-slate-100 px-4 py-8 md:px-10"><div className="mx-auto max-w-7xl">
    <button onClick={() => navigate(-1)} className="mb-6 rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">&larr; Back</button>
    <div className="mb-7 rounded-3xl bg-gradient-to-r from-blue-700 to-cyan-600 p-7 text-white shadow-xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Marketlence Jobs</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">Build your professional resume</h1><p className="mt-2 text-blue-50">Fill in your details, save your draft, then choose “Save as PDF” in the print window.</p></div>
    <div className="grid gap-7 lg:grid-cols-2"><div className="rounded-3xl bg-white p-6 shadow-lg md:p-8"><h2 className="text-2xl font-bold text-slate-900">Your details</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Full name<input name="fullName" value={resume.fullName} onChange={updateField} className={fieldClass} placeholder="Your full name" /></label><label className="text-sm font-semibold text-slate-700">Phone<input name="phone" value={resume.phone} onChange={updateField} className={fieldClass} placeholder="+91 ..." /></label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Email<input name="email" type="email" value={resume.email} onChange={updateField} className={fieldClass} placeholder="you@email.com" /></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Location<input name="location" value={resume.location} onChange={updateField} className={fieldClass} placeholder="City, State" /></label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Professional summary<textarea name="summary" value={resume.summary} onChange={updateField} className={fieldClass} rows="4" placeholder="Briefly describe your strengths and career goals." /></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Skills <span className="font-normal text-slate-400">(separate with commas)</span><textarea name="skills" value={resume.skills} onChange={updateField} className={fieldClass} rows="3" placeholder="React, Communication, Sales" /></label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Experience <span className="font-normal text-slate-400">(one achievement per line)</span><textarea name="experience" value={resume.experience} onChange={updateField} className={fieldClass} rows="5" placeholder="Software Developer, ABC Ltd — 2023 to Present" /></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Education <span className="font-normal text-slate-400">(one entry per line)</span><textarea name="education" value={resume.education} onChange={updateField} className={fieldClass} rows="4" placeholder="B.Tech Computer Science, University Name — 2023" /></label>
    </div><div className="mt-6 flex flex-wrap gap-3"><button onClick={saveDraft} className="rounded-xl border border-blue-600 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50">Save draft</button><button onClick={downloadPdf} className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-bold text-white shadow-md transition hover:from-blue-700 hover:to-cyan-600">Download as PDF</button></div></div>
    <div className="rounded-3xl bg-slate-200 p-4 shadow-inner md:p-6"><p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Live preview</p><div className="min-h-full rounded-sm bg-white p-7 shadow-xl md:p-10"><h2 className="text-3xl font-bold text-blue-700">{resume.fullName || "Your Name"}</h2><p className="mt-2 text-sm text-slate-500">{[resume.email, resume.phone, resume.location].filter(Boolean).join(" | ") || "Email | Phone | Location"}</p>
      {resume.summary && <><h3 className="mt-7 border-b-2 border-blue-100 pb-2 text-sm font-bold uppercase tracking-wider text-blue-700">Professional Summary</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{resume.summary}</p></>}{resume.skills && <><h3 className="mt-7 border-b-2 border-blue-100 pb-2 text-sm font-bold uppercase tracking-wider text-blue-700">Skills</h3><div className="mt-3 flex flex-wrap gap-2">{resume.skills.split(",").filter(Boolean).map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{skill.trim()}</span>)}</div></>}{resume.experience && <><h3 className="mt-7 border-b-2 border-blue-100 pb-2 text-sm font-bold uppercase tracking-wider text-blue-700">Experience</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{textLines(resume.experience).map((line) => <li key={line}>{line}</li>)}</ul></>}{resume.education && <><h3 className="mt-7 border-b-2 border-blue-100 pb-2 text-sm font-bold uppercase tracking-wider text-blue-700">Education</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{textLines(resume.education).map((line) => <li key={line}>{line}</li>)}</ul></>}</div></div></div>
  </div></div>;
}

export default ResumeBuilder;
