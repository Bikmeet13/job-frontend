import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const statuses = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Interview Completed", "Selected", "Not Selected"];
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const auth = () => ({ headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
const initialOffer = { jurisdictionCountry: "", jurisdictionState: "", jobTitle: "", department: "", employmentType: "Full-time", compensation: "", currency: "INR", joiningDate: "", expiresAt: "", probationTerms: "", noticeTerms: "", conditions: "", employerTerms: "", authorized: false };

export default function EmployerApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [active, setActive] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Applied");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [offer, setOffer] = useState(initialOffer);
  const [handoff, setHandoff] = useState({ department: "", jobTitle: "", joiningDate: "", managerName: "", notes: "" });
  const [interview, setInterview] = useState({ scheduledAt: "", interviewType: "Video interview", interviewerName: "", meetingLink: "", note: "" });
  const [score, setScore] = useState({ skillsScore: 3, experienceScore: 3, communicationScore: 3, cultureScore: 3, recommendation: "Hold", notes: "" });

  const load = async () => {
    try { const response = await axios.get(API + "/employer/applications", auth()); setApplications(response.data || []); }
    catch { toast.error("Could not load employer applications."); navigate("/employer/login"); }
  };
  const refresh = async (candidate = active) => {
    if (!candidate) return;
    const response = await axios.get(API + "/applications/" + candidate.id + "/workspace", auth());
    setWorkspace(response.data);
  };
  useEffect(() => { load(); }, []);
  const open = async (candidate) => {
    setActive(candidate); setStatus(candidate.status || "Applied"); setNote(candidate.status_note || ""); setWorkspace(null);
    setOffer({ ...initialOffer, jobTitle: candidate.title || "" });
    setHandoff({ department: "", jobTitle: candidate.title || "", joiningDate: "", managerName: "", notes: "" });
    try { await refresh(candidate); } catch { toast.error("Could not open candidate workspace."); }
  };
  const visible = useMemo(() => applications.filter((item) => (stage === "All" || (item.status || "Applied") === stage) && (item.name + " " + item.title + " " + item.email).toLowerCase().includes(query.toLowerCase())), [applications, query, stage]);
  const updateStatus = async () => {
    setSaving(true);
    try { await axios.patch(API + "/employer/applications/" + active.id + "/status", { status, note }, auth()); const updated = { ...active, status, status_note: note }; setActive(updated); await Promise.all([load(), refresh(updated)]); toast.success("Candidate updated and notified."); }
    catch (error) { toast.error(error.response?.data?.error || "Could not update candidate."); } finally { setSaving(false); }
  };
  const schedule = async () => {
    if (!interview.scheduledAt) return toast.error("Choose an interview date and time.");
    setSaving(true);
    try { await axios.post(API + "/employer/applications/" + active.id + "/interviews", interview, auth()); setInterview({ scheduledAt: "", interviewType: "Video interview", interviewerName: "", meetingLink: "", note: "" }); await refresh(); toast.success("Interview scheduled and candidate notified."); }
    catch (error) { toast.error(error.response?.data?.error || "Could not schedule interview."); } finally { setSaving(false); }
  };
  const saveScore = async () => {
    try { await axios.put(API + "/employer/applications/" + active.id + "/scorecard", score, auth()); await refresh(); toast.success("Private scorecard saved."); }
    catch (error) { toast.error(error.response?.data?.error || "Could not save scorecard."); }
  };
  const issueOffer = async () => {
    setSaving(true);
    try { const result = await axios.post(API + "/employer/applications/" + active.id + "/offers", offer, auth()); toast.success(result.data.message); setOffer({ ...initialOffer, jobTitle: active.title || "" }); await refresh(); }
    catch (error) { toast.error(error.response?.data?.error || "Could not issue offer letter."); } finally { setSaving(false); }
  };
  const onboard = async () => {
    setSaving(true);
    try { const result = await axios.post(API + "/employer/applications/" + active.id + "/onboard", handoff, auth()); toast.success(result.data.message); await Promise.all([load(), refresh()]); }
    catch (error) { toast.error(error.response?.data?.error || "Could not add candidate to People Hub."); } finally { setSaving(false); }
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    try { await axios.post(API + "/applications/" + active.id + "/messages", { body: message }, auth()); setMessage(""); await refresh(); }
    catch (error) { toast.error(error.response?.data?.error || "Could not send message."); }
  };
  const requestDocument = async () => {
    if (!documentName.trim()) return;
    try { await axios.post(API + "/employer/applications/" + active.id + "/documents/request", { documentName }, auth()); setDocumentName(""); await refresh(); toast.success("Document request sent."); }
    catch (error) { toast.error(error.response?.data?.error || "Could not request document."); }
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8"><div className="mx-auto max-w-7xl">
    <button onClick={() => navigate("/employer/dashboard")} className="font-bold text-indigo-700">← Employer dashboard</button>
    <header className="mt-4 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-xl"><p className="text-xs font-black tracking-[.18em] text-cyan-300">TALENT ACQUISITION</p><h1 className="mt-2 text-3xl font-black">Hiring command centre</h1><p className="mt-2 text-sm text-indigo-100">A complete, auditable journey from application to onboarding.</p></header>
    <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates" className={field}/><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{["All", ...statuses].map((item) => <button key={item} onClick={() => setStage(item)} className={stage === item ? "whitespace-nowrap rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white" : "whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"}>{item}</button>)}</div><div className="mt-4 space-y-2">{visible.map((item) => <button key={item.id} onClick={() => open(item)} className={active?.id === item.id ? "w-full rounded-2xl bg-indigo-600 p-4 text-left text-white shadow-lg" : "w-full rounded-2xl bg-slate-50 p-4 text-left hover:bg-indigo-50"}><b>{item.name}</b><p className="mt-1 text-sm opacity-80">{item.title}</p><p className="mt-2 text-xs opacity-70">{item.status || "Applied"}</p></button>)}{!visible.length && <p className="p-8 text-center text-sm text-slate-500">No candidates here.</p>}</div></aside>
      {!active ? <section className="grid min-h-[540px] place-items-center rounded-3xl bg-white p-8 text-center shadow-sm"><div><h2 className="text-2xl font-black">Choose a candidate</h2><p className="mt-2 text-slate-500">Review, interview, issue an offer, and onboard in one workspace.</p></div></section> :
      <section className="rounded-3xl bg-white p-5 shadow-sm md:p-7"><div className="border-b pb-5"><p className="text-xs font-black tracking-widest text-indigo-600">CANDIDATE WORKSPACE</p><h2 className="mt-1 text-3xl font-black">{active.name}</h2><p className="mt-1 text-slate-600">{active.email} · {active.title}</p>{active.resume && <a href={active.resume} target="_blank" rel="noreferrer" className="mt-3 inline-block font-bold text-indigo-700 underline">Open resume</a>}</div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border p-4"><h3 className="font-black">Pipeline decision</h3><select value={status} onChange={(event) => setStatus(event.target.value)} className={"mt-3 " + field}>{statuses.map((item) => <option key={item}>{item}</option>)}</select><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Candidate-facing update" className={"mt-3 min-h-20 " + field}/><button disabled={saving} onClick={updateStatus} className="mt-3 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white">Save & notify</button></section>
        <section className="rounded-2xl border p-4"><h3 className="font-black">Schedule interview</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><input type="datetime-local" value={interview.scheduledAt} onChange={(event) => setInterview({ ...interview, scheduledAt: event.target.value })} className={field}/><select value={interview.interviewType} onChange={(event) => setInterview({ ...interview, interviewType: event.target.value })} className={field}>{["Video interview", "Phone screen", "In-person interview", "Assessment", "Final interview"].map((item) => <option key={item}>{item}</option>)}</select><input value={interview.interviewerName} onChange={(event) => setInterview({ ...interview, interviewerName: event.target.value })} placeholder="Interviewer name" className={field}/><input value={interview.meetingLink} onChange={(event) => setInterview({ ...interview, meetingLink: event.target.value })} placeholder="Meeting link" className={field}/></div><textarea value={interview.note} onChange={(event) => setInterview({ ...interview, note: event.target.value })} placeholder="Candidate preparation note" className={"mt-3 min-h-16 " + field}/><button disabled={saving} onClick={schedule} className="mt-3 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white">Schedule & notify</button><div className="mt-3 space-y-2">{workspace?.interviews?.map((item) => <p key={item.id} className="rounded-xl bg-violet-50 p-3 text-sm"><b>{item.interview_type}</b> · {new Date(item.scheduled_at).toLocaleString()}</p>)}</div></section>
        <section className="rounded-2xl border p-4"><h3 className="font-black">Structured scorecard</h3><div className="mt-3 grid grid-cols-2 gap-3">{[["skillsScore", "Skills"], ["experienceScore", "Experience"], ["communicationScore", "Communication"], ["cultureScore", "Role fit"]].map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<select value={score[key]} onChange={(event) => setScore({ ...score, [key]: Number(event.target.value) })} className={"mt-1 " + field}>{[0,1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>)}</div><select value={score.recommendation} onChange={(event) => setScore({ ...score, recommendation: event.target.value })} className={"mt-3 " + field}>{["Strong yes", "Yes", "Hold", "No"].map((item) => <option key={item}>{item}</option>)}</select><textarea value={score.notes} onChange={(event) => setScore({ ...score, notes: event.target.value })} placeholder="Evidence-based private feedback" className={"mt-3 min-h-16 " + field}/><button onClick={saveScore} className="mt-3 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white">Save scorecard</button></section>
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><h3 className="font-black text-emerald-950">Hire & add to People Hub</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={handoff.department} onChange={(event) => setHandoff({ ...handoff, department: event.target.value })} placeholder="Department" className={field}/><input value={handoff.jobTitle} onChange={(event) => setHandoff({ ...handoff, jobTitle: event.target.value })} placeholder="Job title" className={field}/><input type="date" value={handoff.joiningDate} onChange={(event) => setHandoff({ ...handoff, joiningDate: event.target.value })} className={field}/><input value={handoff.managerName} onChange={(event) => setHandoff({ ...handoff, managerName: event.target.value })} placeholder="Manager" className={field}/></div><textarea value={handoff.notes} onChange={(event) => setHandoff({ ...handoff, notes: event.target.value })} placeholder="Private onboarding note" className={"mt-3 min-h-16 " + field}/><button disabled={saving} onClick={onboard} className="mt-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Add candidate to People Hub</button></section>
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 xl:col-span-2"><h3 className="font-black text-indigo-950">Formal employment offer letter</h3><p className="mt-1 text-xs text-indigo-800">Select the employer's own country and state/province. MarketLence records the offer; the employer is responsible for local-law compliance and legal review.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><input value={offer.jurisdictionCountry} onChange={(event) => setOffer({ ...offer, jurisdictionCountry: event.target.value })} placeholder="Country / jurisdiction *" className={field}/><input value={offer.jurisdictionState} onChange={(event) => setOffer({ ...offer, jurisdictionState: event.target.value })} placeholder="State / province *" className={field}/><input value={offer.jobTitle} onChange={(event) => setOffer({ ...offer, jobTitle: event.target.value })} placeholder="Job title *" className={field}/><input value={offer.department} onChange={(event) => setOffer({ ...offer, department: event.target.value })} placeholder="Department" className={field}/><select value={offer.employmentType} onChange={(event) => setOffer({ ...offer, employmentType: event.target.value })} className={field}>{["Full-time", "Part-time", "Contract", "Internship", "Temporary"].map((item) => <option key={item}>{item}</option>)}</select><input type="date" value={offer.joiningDate} onChange={(event) => setOffer({ ...offer, joiningDate: event.target.value })} className={field}/><input value={offer.compensation} onChange={(event) => setOffer({ ...offer, compensation: event.target.value })} placeholder="Compensation and pay frequency *" className={field}/><input value={offer.currency} onChange={(event) => setOffer({ ...offer, currency: event.target.value.toUpperCase() })} placeholder="Currency, e.g. INR *" className={field}/><input type="datetime-local" value={offer.expiresAt} onChange={(event) => setOffer({ ...offer, expiresAt: event.target.value })} className={field}/></div><div className="mt-3 grid gap-3 md:grid-cols-3"><textarea value={offer.probationTerms} onChange={(event) => setOffer({ ...offer, probationTerms: event.target.value })} placeholder="Probation terms" className={"min-h-24 " + field}/><textarea value={offer.noticeTerms} onChange={(event) => setOffer({ ...offer, noticeTerms: event.target.value })} placeholder="Notice terms" className={"min-h-24 " + field}/><textarea value={offer.conditions} onChange={(event) => setOffer({ ...offer, conditions: event.target.value })} placeholder="Pre-employment conditions" className={"min-h-24 " + field}/></div><textarea value={offer.employerTerms} onChange={(event) => setOffer({ ...offer, employerTerms: event.target.value })} placeholder="Employer's complete offer terms *" className={"mt-3 min-h-28 " + field}/><label className="mt-3 flex items-start gap-2 text-sm text-indigo-950"><input type="checkbox" checked={offer.authorized} onChange={(event) => setOffer({ ...offer, authorized: event.target.checked })} className="mt-1"/>I confirm I am authorized to issue this offer for my organisation.</label><button disabled={saving} onClick={issueOffer} className="mt-3 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white">Issue formal offer letter</button><div className="mt-4 space-y-2">{workspace?.offers?.map((item) => <div key={item.id} className="rounded-xl border border-indigo-100 bg-white p-3 text-sm"><b>Version {item.version} · {item.status}</b><span className="ml-2 text-slate-600">{item.job_title} · {item.jurisdiction_country}, {item.jurisdiction_state}</span><p className="mt-1 text-slate-600">{item.currency} {item.compensation}{item.candidate_signature ? " · signed by " + item.candidate_signature : ""}</p></div>)}</div></section>
        <section className="rounded-2xl border p-4 xl:col-span-2"><h3 className="font-black">Documents & conversation</h3><input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Request document, e.g. certificate" className={"mt-3 " + field}/><button onClick={requestDocument} className="mt-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white">Request document</button><div className="mt-3 space-y-2">{workspace?.documents?.map((item) => <p key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{item.document_name}</b> · {item.status}{item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer" className="ml-2 font-bold text-indigo-700 underline">View</a>}</p>)}</div><div className="mt-4 border-t pt-4"><b>Secure messages</b><div className="mt-2 max-h-32 space-y-2 overflow-y-auto">{workspace?.messages?.map((item) => <p key={item.id} className="rounded-xl bg-slate-50 p-2 text-sm"><b>{item.sender_role === "employer" ? "You" : "Candidate"}:</b> {item.body}</p>)}</div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" className={"mt-3 min-h-16 " + field}/><button onClick={sendMessage} className="mt-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white">Send</button></div></section>
      </div></section>}
    </div>
  </div></main>;
}
