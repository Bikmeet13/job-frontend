import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const field = "w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500";
const initialForm = { title: "", city: "", state: "", jobType: "Full-time", workplaceType: "Onsite", jobCategory: "Private", minExperience: "0", maxExperience: "", minSalary: "", maxSalary: "", showSalary: true, skills: "", description: "", rolesResponsibilities: "", education: "", openings: 1, deadline: "", applicationMethod: "url", applicationValue: "https://", featureRequestedPlan: "" };

export default function EmployerPostJob() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const edit = params.get("edit");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const change = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => {
      if (name === "applicationMethod") return { ...current, applicationMethod: value, applicationValue: value === "url" && (!current.applicationValue || !current.applicationValue.startsWith("http")) ? "https://" : current.applicationValue };
      return { ...current, [name]: type === "checkbox" ? checked : value };
    });
  };

  useEffect(() => {
    if (!edit) return;
    axios.get(`${API}/employer/jobs/${edit}`, auth()).then(({ data: job }) => {
      const [city = "", state = ""] = String(job.location || "").split(",").map((item) => item.trim());
      const applicationMethod = job.application_method || "url";
      setForm({ ...initialForm, title: job.title || "", city, state, jobType: job.type || "Full-time", workplaceType: job.mode || "Onsite", jobCategory: job.job_category || "Private", skills: job.skills || "", description: job.description || "", rolesResponsibilities: job.roles_responsibilities || "", education: job.education || "", openings: job.openings || 1, deadline: job.last_date || "", applicationMethod, applicationValue: job.apply_link || (applicationMethod === "url" ? "https://" : ""), featureRequestedPlan: job.feature_requested_plan || "" });
    }).catch(() => toast.error("Could not load this job."));
  }, [edit]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await (edit ? axios.put(`${API}/employer/jobs/${edit}`, form, auth()) : axios.post(`${API}/employer/jobs`, form, auth()));
      toast.success(form.featureRequestedPlan ? "Job submitted for review. Your featured request will be ready after approval." : edit ? "Job updated for review" : "Job sent for review");
      navigate("/employer/dashboard");
    } catch (error) { toast.error(error.response?.data?.error || "Could not submit job."); }
    finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-slate-100 p-5 md:p-9"><form onSubmit={submit} className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-xl md:p-10">
    <button type="button" onClick={() => navigate("/employer/dashboard")} className="font-bold text-blue-700">← Dashboard</button><h1 className="mt-4 text-3xl font-black">{edit ? "Edit job" : "Post a job"}</h1><p className="mt-2 text-slate-600">Every new or edited job is reviewed before it is visible publicly.</p>
    <div className="mt-7 grid gap-4 md:grid-cols-2"><input required name="title" value={form.title} onChange={change} placeholder="Job title *" className={field}/><input required name="jobCategory" value={form.jobCategory} onChange={change} placeholder="Job category / industry" className={field}/><input required name="city" value={form.city} onChange={change} placeholder="City *" className={field}/><input required name="state" value={form.state} onChange={change} placeholder="State *" className={field}/><select name="jobType" value={form.jobType} onChange={change} className={field}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select><select name="workplaceType" value={form.workplaceType} onChange={change} className={field}><option>Onsite</option><option>Remote</option><option>Hybrid</option></select><input name="minExperience" value={form.minExperience} onChange={change} placeholder="Minimum experience" className={field}/><input name="maxExperience" value={form.maxExperience} onChange={change} placeholder="Maximum experience" className={field}/><input name="minSalary" value={form.minSalary} onChange={change} placeholder="Minimum salary" className={field}/><input name="maxSalary" value={form.maxSalary} onChange={change} placeholder="Maximum salary" className={field}/><input name="skills" value={form.skills} onChange={change} placeholder="Key skills" className={field}/><input type="number" min="1" name="openings" value={form.openings} onChange={change} placeholder="Number of openings" className={field}/><input name="education" value={form.education} onChange={change} placeholder="Education requirements" className={field}/><input type="date" name="deadline" value={form.deadline} onChange={change} className={field}/><select name="applicationMethod" value={form.applicationMethod} onChange={change} className={field}><option value="url">Apply URL</option><option value="email">Application email</option></select><input required name="applicationValue" value={form.applicationValue} onChange={change} placeholder={form.applicationMethod === "email" ? "jobs@company.com" : "https://company.com/careers"} className={field}/></div>
    <label className="mt-4 flex items-center gap-2 font-medium"><input type="checkbox" name="showSalary" checked={form.showSalary} onChange={change}/> Show salary range</label>
    <section className="mt-5 rounded-2xl border-2 border-violet-100 bg-violet-50 p-5"><p className="text-sm font-bold text-violet-700">OPTIONAL PROMOTION</p><h2 className="mt-1 text-xl font-black text-slate-900">Make this job featured</h2><p className="mt-1 text-sm text-slate-600">Featured jobs receive prominent placement after this job is approved. You will be able to complete payment once it is live.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><label className={`cursor-pointer rounded-xl border-2 p-4 ${!form.featureRequestedPlan ? "border-violet-600 bg-white" : "border-transparent bg-white/70"}`}><input className="sr-only" type="radio" name="featureRequestedPlan" value="" checked={!form.featureRequestedPlan} onChange={change}/><b>No thanks</b><p className="mt-1 text-xs text-slate-600">Standard free listing</p></label><label className={`cursor-pointer rounded-xl border-2 p-4 ${form.featureRequestedPlan === "featured_11" ? "border-violet-600 bg-white" : "border-transparent bg-white/70"}`}><input className="sr-only" type="radio" name="featureRequestedPlan" value="featured_11" checked={form.featureRequestedPlan === "featured_11"} onChange={change}/><b>₹299 · 11 days</b><p className="mt-1 text-xs text-slate-600">Featured listing request</p></label><label className={`cursor-pointer rounded-xl border-2 p-4 ${form.featureRequestedPlan === "featured_29" ? "border-violet-600 bg-white" : "border-transparent bg-white/70"}`}><input className="sr-only" type="radio" name="featureRequestedPlan" value="featured_29" checked={form.featureRequestedPlan === "featured_29"} onChange={change}/><b>₹499 · 29 days</b><p className="mt-1 text-xs text-slate-600">Featured listing request</p></label></div></section>
    <textarea required name="description" value={form.description} onChange={change} placeholder="Job description *" className={`${field} mt-4 min-h-40`}/><textarea name="rolesResponsibilities" value={form.rolesResponsibilities} onChange={change} placeholder="Roles and responsibilities" className={`${field} mt-4 min-h-32`}/><button disabled={submitting} className="mt-7 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? "Submitting..." : "Submit for review"}</button>
  </form></main>;
}
