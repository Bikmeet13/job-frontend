import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { COUNTRIES } from "../data/countries";

function AdminDashboard() {

  const [shortlisted, setShortlisted] = useState([]);
    const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState("");
const [company, setCompany] = useState("");
const [location, setLocation] = useState("");
const [salary, setSalary] = useState("");
const [experience, setExperience] = useState("");
const [skills, setSkills] = useState("");
const [type, setType] = useState("");
const [jobCategory, setJobCategory] = useState("");
const [mode, setMode] = useState("");
const [jobCountry, setJobCountry] = useState("in");
const [filterStatus, setFilterStatus] = useState("all");
const [filterType, setFilterType] = useState("all"); // all / shortlisted
const [chatData, setChatData] = useState([]);
const [activeChatId, setActiveChatId] = useState(null);
const [answersMap, setAnswersMap] = useState({});
const [loadingMap, setLoadingMap] = useState({});
const [countMap, setCountMap] = useState({});
const [questions, setQuestions] = useState([""]);
const [description, setDescription] = useState("");
const [lastDate, setLastDate] = useState("");
const [applyEnabled, setApplyEnabled] = useState(true);
const [applyLink, setApplyLink] = useState("");
const [jobSearch, setJobSearch] = useState("");
const [jobFilter, setJobFilter] = useState("all");
const [editingJob, setEditingJob] = useState(null);
const [adminRequests, setAdminRequests] = useState([]);
const [governmentSources, setGovernmentSources] = useState([]);
const [governmentDrafts, setGovernmentDrafts] = useState([]);
const [governmentSourceName, setGovernmentSourceName] = useState("");
const [governmentSourceUrl, setGovernmentSourceUrl] = useState("");
const [governmentSourceState, setGovernmentSourceState] = useState("national");
const [governmentScanning, setGovernmentScanning] = useState(false);
const [companySources, setCompanySources] = useState([]);
const [companyDrafts, setCompanyDrafts] = useState([]);
const [companySourceName, setCompanySourceName] = useState("");
const [companySourceUrl, setCompanySourceUrl] = useState("");
const [companySourceCategory, setCompanySourceCategory] = useState("Private");
const [companyScanning, setCompanyScanning] = useState(false);
const [visaSources, setVisaSources] = useState([]);
const [visaDrafts, setVisaDrafts] = useState([]);
const [visaScanning, setVisaScanning] = useState(false);
const [showGovernmentAgent, setShowGovernmentAgent] = useState(false);
const [showCompanyAgent, setShowCompanyAgent] = useState(false);
const [showVisaAgent, setShowVisaAgent] = useState(false);
const [showPostedJobs, setShowPostedJobs] = useState(false);
const [selectedGovernmentDraftIds, setSelectedGovernmentDraftIds] = useState([]);
const [selectedCompanyDraftIds, setSelectedCompanyDraftIds] = useState([]);
const [bulkApprovingGovernment, setBulkApprovingGovernment] = useState(false);
const [bulkApprovingCompany, setBulkApprovingCompany] = useState(false);
const [employerJobs, setEmployerJobs] = useState([]);
const [employers, setEmployers] = useState([]);
const [showEmployerModeration, setShowEmployerModeration] = useState(false);

const navigate = useNavigate();

const role = localStorage.getItem("role");

const loadEmployerModeration = async () => {
  try {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const [employerRes, jobsRes] = await Promise.all([
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/admin/employers", { headers }),
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/admin/employer-jobs", { headers }),
    ]);
    setEmployers(employerRes.data); setEmployerJobs(jobsRes.data);
  } catch (error) { console.log("Could not load employer moderation", error); }
};
const moderateEmployerJob = async (id, action) => { try { await axios.patch(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/admin/employer-jobs/${id}`, { action }, { headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } }); toast.success("Employer job updated"); loadEmployerModeration(); } catch (e) { toast.error(e.response?.data?.error || "Could not update job"); } };
const updateEmployer = async (employer, changes) => { try { await axios.patch(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/admin/employers/${employer.id}`, { verified: changes.verified ?? employer.employer_verified, suspended: changes.suspended ?? employer.employer_suspended }, { headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } }); toast.success("Employer updated"); loadEmployerModeration(); } catch { toast.error("Could not update employer"); } };

const handleDelete = (id) => {
  const token = localStorage.getItem("token");
if (!token) return;
  if (window.confirm("Are you sure you want to delete this application?")) {
    deleteApplication(id);
  }
};

const handleJobDelete = (id) => {
  const token = localStorage.getItem("token");
if (!token) return;
  if (window.confirm("Are you sure you want to delete this job?")) {
    deleteJob(id);
  }
};

const addToShortlist = async (app) => {
  try {
    const token = localStorage.getItem("token");

    await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist",
      {
        applicationId: app.id,
        userId: 1
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setShortlisted([...shortlisted, app]);

  } catch (err) {
    console.log(err);
  }
};

const removeFromShortlist = async (id) => {
  try {
    const token = localStorage.getItem("token");

    await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setShortlisted(shortlisted.filter(item => item.id !== id));
  } catch (err) {
    console.log(err);
  }
};

const deleteAllApplications = async () => {

  const token = localStorage.getItem("token");
if (!token) return;
  if (!window.confirm("Are you sure you want to delete ALL applications?")) return;

  try {
    await axios.delete(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setApplications([]); // clear UI
    toast.success("All applications deleted ✅");

  } catch (err) {
    console.log(err);
    toast.error("Unauthorized or failed ❌");
  }
};

  const addJob = async (e) => {
  e.preventDefault();

  try {
    await axios.post(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs",
  {
    title,
    company,
    location,
    salary,
    experience,
    skills,
    description,
    lastDate,
    type,
    jobCategory,
    country: jobCountry,
    mode,
    chatbotQuestions: questions.filter(q => q.trim() !== ""),
    applyEnabled,
    applyLink
  },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  }
);

    toast.success("Job added successfully 🚀");

    // refetch jobs instead
axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs")
  .then(res => setJobs(res.data));
  
     // clear form
    setTitle("");
    setCompany("");
    setLocation("");
    setSalary("");
    setExperience("");
    setSkills("");
    setType("");
    setJobCategory("");
    setJobCountry("in");
    setMode("");
    setDescription("");
    setLastDate("");
    setApplyEnabled(true);
    setApplyLink("");
    
  
  } catch (err) {
    console.log(err);
    toast.error("Failed to add job ❌");
  }
};

const fetchAdminRequests = async () => {
  try {
    const res = await axios.get(
     "https://humorous-fulfillment-production-1f5e.up.railway.app/api/admin-requests",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    setAdminRequests(res.data);

  } catch (err) {
    console.log(err);
  }
}; 

const deleteJob = async (id) => {
  console.log("Deleting job:", id);

  try {
    const res = await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    console.log(res.data);

    setJobs(jobs.filter(job => job.id !== id));

    alert("Job deleted ✅");

  } catch (err) {
    console.log(err);
  }
};

const startEditingJob = (job) => {
  setEditingJob({
    ...job,
    applyEnabled: job.apply_enabled !== false,
    applyLink: job.apply_link || job.applyLink || "",
    jobCategory: job.job_category || job.jobCategory || "",
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const saveEditedJob = async (e) => {
  e.preventDefault();
  if (!editingJob) return;

  try {
    const res = await axios.put(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs/${editingJob.id}`,
      {
        title: editingJob.title,
        company: editingJob.company,
        location: editingJob.location,
        salary: editingJob.salary,
        experience: editingJob.experience,
        skills: editingJob.skills,
        description: editingJob.description,
        lastDate: editingJob.last_date || editingJob.lastDate || null,
        type: editingJob.type,
        jobCategory: editingJob.job_category || editingJob.jobCategory || null,
        mode: editingJob.mode,
        applyEnabled: editingJob.applyEnabled,
        applyLink: editingJob.applyLink,
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );

    setJobs(jobs.map((job) => job.id === editingJob.id ? res.data.job : job));
    setEditingJob(null);
    toast.success("Job updated successfully");
  } catch (err) {
    console.log(err);
    toast.error("Could not update the job");
  }
};

const approveAdmin = async (id) => {
  try {
    await axios.put(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/approve-admin/${id}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    toast.success("Approved ✅");
    fetchAdminRequests();

  } catch (err) {
    console.log(err);
    toast.error("Failed ❌");
  }
};

const fetchChat = async (id) => {
  setLoadingMap(prev => ({ ...prev, [id]: true }));

  try {
    const res = await axios.get(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/chatbot-response/${id}`
    );

    setChatData(res.data);
    setActiveChatId(id);

  } catch (err) {
    console.log(err);
  }

  setLoadingMap(prev => ({ ...prev, [id]: false }));
};

const deleteApplication = async (id) => {
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setApplications(applications.filter(app => app.id !== id));
  } catch (err) {
    console.log(err);
  }
};

const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/login");
};
  const updateStatus = async (id, status) => {
  try {
    const token = localStorage.getItem("token");

    await axios.put(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications/${id}`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // update UI
    setApplications(applications.map(app =>
      app.id === id ? { ...app, status } : app
    ));

  } catch (err) {
    console.log(err);
  }
};

const rejectAdmin = async (id) => {
  try {
    await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/reject-admin/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    toast.success("Rejected ❌");
    fetchAdminRequests();

  } catch (err) {
    console.log(err);
    toast.error("Failed ❌");
  }
};

const governmentAgentHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

const fetchGovernmentJobAgentData = async () => {
  try {
    const [sourcesRes, draftsRes] = await Promise.all([
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/sources", governmentAgentHeaders()),
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/drafts", governmentAgentHeaders()),
    ]);
    setGovernmentSources(sourcesRes.data);
    setGovernmentDrafts(draftsRes.data);
  } catch (err) {
    console.log(err);
  }
};

const addGovernmentSource = async (e) => {
  e.preventDefault();
  try {
    await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/sources",
      { name: governmentSourceName, url: governmentSourceUrl, state: governmentSourceState },
      governmentAgentHeaders()
    );
    setGovernmentSourceName("");
    setGovernmentSourceUrl("");
    setGovernmentSourceState("national");
    toast.success("Official source added");
    fetchGovernmentJobAgentData();
  } catch (err) {
    toast.error(err.response?.data?.error || "Could not add source");
  }
};

const scanGovernmentSources = async () => {
  setGovernmentScanning(true);
  try {
    const result = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/scan",
      {},
      governmentAgentHeaders()
    );
    toast.success(`Scan complete: ${result.data.discovered} new notifications found`);
    fetchGovernmentJobAgentData();
  } catch (err) {
    toast.error("Government job scan failed");
  } finally {
    setGovernmentScanning(false);
  }
};

const reviewGovernmentDraft = async (id, action) => {
  try {
    await axios.post(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/drafts/${id}/${action}`,
      {},
      governmentAgentHeaders()
    );
    toast.success(action === "approve" ? "Government job published" : "Notification dismissed");
    fetchGovernmentJobAgentData();
  } catch (err) {
    toast.error(err.response?.data?.error || "Could not review this notification");
  }
};

const toggleGovernmentDraftSelection = (id) => {
  setSelectedGovernmentDraftIds((current) => current.includes(id)
    ? current.filter((selectedId) => selectedId !== id)
    : [...current, id]
  );
};

const toggleAllGovernmentDrafts = () => {
  setSelectedGovernmentDraftIds((current) => current.length === governmentDrafts.length ? [] : governmentDrafts.map((draft) => draft.id));
};

const approveSelectedGovernmentDrafts = async () => {
  if (!selectedGovernmentDraftIds.length || bulkApprovingGovernment) return;
  if (!window.confirm(`Approve and publish ${selectedGovernmentDraftIds.length} selected government opening(s)?`)) return;

  setBulkApprovingGovernment(true);
  const selectedIds = [...selectedGovernmentDraftIds];
  const results = await Promise.allSettled(selectedIds.map((id) => axios.post(
    `https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/drafts/${id}/approve`,
    {},
    governmentAgentHeaders()
  )));
  const approved = results.filter((result) => result.status === "fulfilled").length;
  setSelectedGovernmentDraftIds([]);
  await fetchGovernmentJobAgentData();
  setBulkApprovingGovernment(false);
  approved === selectedIds.length
    ? toast.success(`${approved} government opening(s) published`)
    : toast.error(`${approved} of ${selectedIds.length} government openings were published. Please retry the remaining ones.`);
};

const removeGovernmentSource = async (id) => {
  try {
    await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/government-job-agent/sources/${id}`,
      governmentAgentHeaders()
    );
    fetchGovernmentJobAgentData();
  } catch (err) {
    toast.error("Could not remove source");
  }
};

const fetchCompanyJobAgentData = async () => {
  try {
    const [sourcesRes, draftsRes] = await Promise.all([
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/sources", governmentAgentHeaders()),
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/drafts", governmentAgentHeaders()),
    ]);
    setCompanySources(sourcesRes.data);
    setCompanyDrafts(draftsRes.data);
  } catch (err) {
    console.log(err);
  }
};

const addCompanySource = async (e) => {
  e.preventDefault();
  try {
    await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/sources",
      { name: companySourceName, url: companySourceUrl, jobCategory: companySourceCategory },
      governmentAgentHeaders()
    );
    setCompanySourceName("");
    setCompanySourceUrl("");
    setCompanySourceCategory("Private");
    toast.success("Company careers source added");
    fetchCompanyJobAgentData();
  } catch (err) {
    toast.error(err.response?.data?.error || "Could not add company source");
  }
};

const scanCompanySources = async () => {
  setCompanyScanning(true);
  try {
    const result = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/scan",
      {},
      governmentAgentHeaders()
    );
    toast.success(result.data.message || "Company job scan started");
    // The scan runs in the background because there are many sources. Refresh
    // the review list shortly after the new openings have been collected.
    setTimeout(fetchCompanyJobAgentData, 8000);
  } catch (err) {
    toast.error("Company job scan failed");
  } finally {
    setCompanyScanning(false);
  }
};

const reviewCompanyDraft = async (id, action) => {
  try {
    await axios.post(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/drafts/${id}/${action}`,
      {},
      governmentAgentHeaders()
    );
    toast.success(action === "approve" ? "Company job published" : "Opening dismissed");
    fetchCompanyJobAgentData();
  } catch (err) {
    toast.error(err.response?.data?.error || "Could not review this opening");
  }
};

const toggleCompanyDraftSelection = (id) => {
  setSelectedCompanyDraftIds((current) => current.includes(id)
    ? current.filter((selectedId) => selectedId !== id)
    : [...current, id]
  );
};

const toggleAllCompanyDrafts = () => {
  setSelectedCompanyDraftIds((current) => current.length === companyDrafts.length ? [] : companyDrafts.map((draft) => draft.id));
};

const approveSelectedCompanyDrafts = async () => {
  if (!selectedCompanyDraftIds.length || bulkApprovingCompany) return;
  if (!window.confirm(`Approve and publish ${selectedCompanyDraftIds.length} selected company opening(s)?`)) return;

  setBulkApprovingCompany(true);
  const selectedIds = [...selectedCompanyDraftIds];
  const results = await Promise.allSettled(selectedIds.map((id) => axios.post(
    `https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/drafts/${id}/approve`,
    {},
    governmentAgentHeaders()
  )));
  const approved = results.filter((result) => result.status === "fulfilled").length;
  setSelectedCompanyDraftIds([]);
  await fetchCompanyJobAgentData();
  setBulkApprovingCompany(false);
  approved === selectedIds.length
    ? toast.success(`${approved} company opening(s) published`)
    : toast.error(`${approved} of ${selectedIds.length} company openings were published. Please retry the remaining ones.`);
};

const removeCompanySource = async (id) => {
  try {
    await axios.delete(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/company-job-agent/sources/${id}`,
      governmentAgentHeaders()
    );
    fetchCompanyJobAgentData();
  } catch (err) {
    toast.error("Could not remove company source");
  }
};

const fetchVisaJobAgentData = async () => {
  try {
    const [sources, drafts] = await Promise.all([
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/visa-job-agent/sources", governmentAgentHeaders()),
      axios.get("https://humorous-fulfillment-production-1f5e.up.railway.app/api/visa-job-agent/drafts", governmentAgentHeaders()),
    ]);
    setVisaSources(sources.data);
    setVisaDrafts(drafts.data);
  } catch (err) { console.log(err); }
};

const scanVisaSources = async () => {
  setVisaScanning(true);
  try {
    const result = await axios.post("https://humorous-fulfillment-production-1f5e.up.railway.app/api/visa-job-agent/scan", {}, governmentAgentHeaders());
    toast.success(result.data.message || "Visa sponsorship scan started");
    setTimeout(fetchVisaJobAgentData, 10000);
  } catch { toast.error("Visa sponsorship scan failed"); }
  finally { setVisaScanning(false); }
};

const reviewVisaDraft = async (id, action) => {
  try {
    await axios.post(`https://humorous-fulfillment-production-1f5e.up.railway.app/api/visa-job-agent/drafts/${id}/${action}`, {}, governmentAgentHeaders());
    toast.success(action === "approve" ? "Sponsored job published" : "Opening dismissed");
    fetchVisaJobAgentData();
  } catch (err) { toast.error(err.response?.data?.error || "Could not review sponsored opening"); }
};


  
useEffect(() => {
   const token = localStorage.getItem("token"); 

  if (!token) {
  console.log("No token → skipping API");
  return;
}

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      // jobs
      const jobsRes = await axios.get(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/jobs"
      );
      setJobs(jobsRes.data);

      // applications
      const appRes = await axios.get(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/applications",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setApplications(appRes.data);

      appRes.data.forEach(async (app) => {
  try {
    const r = await axios.get(
      `https://humorous-fulfillment-production-1f5e.up.railway.app/api/chatbot-response/${app.id}`
    );

    setAnswersMap(prev => ({
      ...prev,
      [app.id]: r.data.length > 0
    }));

    setCountMap(prev => ({
      ...prev,
      [app.id]: r.data.length
    }));

  } catch (err) {
    console.log(err);
      if (err.response?.status === 401) {
    console.log("Unauthorized → redirecting");
    localStorage.clear();
    navigate("/admin-login");}    
  }
});


      // shortlist
      const shortRes = await axios.get(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/shortlist/1",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setShortlisted(shortRes.data);

    } catch (err) {
      console.log(err);
    }
  };

  fetchData();
}, []);

useEffect(() => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    navigate("/login");
    return;
  }

  if (role !== "admin" && role !== "superadmin") {
    navigate("/");
  }
}, []);

useEffect(() => {
  if (role === "superadmin") {
    fetchAdminRequests();
  }
}, [role]);

useEffect(() => {
  if (role === "admin" || role === "superadmin") {
    fetchGovernmentJobAgentData();
    fetchCompanyJobAgentData();
    fetchVisaJobAgentData();
    loadEmployerModeration();
  }
}, [role]);



const filteredApplications = (applications || []).filter(app => {

  if (filterStatus !== "all") {
    if ((app.status || "Pending") !== filterStatus) return false;
  }

  if (filterType === "shortlisted") {
    if (!shortlisted.find(item => item.id === app.id)) return false;
  }

  return true;
});

const filteredJobs = (jobs || []).filter((job) => {
  const searchText = `${job.title || ""} ${job.company || ""} ${job.location || ""}`.toLowerCase();
  const acceptsApplications = job.apply_enabled !== false || Boolean(job.apply_link || job.applyLink);

  if (jobSearch.trim() && !searchText.includes(jobSearch.trim().toLowerCase())) return false;
  if (jobFilter === "accepting" && !acceptsApplications) return false;
  if (jobFilter === "closed" && acceptsApplications) return false;
  return true;
});



 

  return (
  <div className="p-10 bg-gray-100 min-h-screen">

    <div className="max-w-5xl mx-auto">

      <section className="mb-8 rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
        <button type="button" onClick={() => setShowEmployerModeration(!showEmployerModeration)} className="flex w-full items-center justify-between text-left text-xl font-bold text-orange-950">Employer posting moderation <span>{showEmployerModeration ? "−" : "+"}</span></button>
        {showEmployerModeration && <><p className="mt-3 text-sm text-orange-800">Verify or suspend employer accounts, then review their pending job posts.</p><div className="mt-4 space-y-2">{employers.map((employer) => <div key={employer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><div><b>{employer.company_name}</b> · {employer.email}<span className="ml-2 text-slate-500">{employer.jobs_count} jobs</span></div><div className="flex gap-2"><button onClick={() => updateEmployer(employer,{verified:!employer.employer_verified})} className="rounded bg-blue-100 px-3 py-1 font-semibold text-blue-800">{employer.employer_verified ? "Verified" : "Verify"}</button><button onClick={() => updateEmployer(employer,{suspended:!employer.employer_suspended})} className="rounded bg-red-100 px-3 py-1 font-semibold text-red-700">{employer.employer_suspended ? "Unsuspend" : "Suspend"}</button></div></div>)}{!employers.length&&<p className="rounded-xl bg-white p-3 text-sm">No employer accounts yet.</p>}</div><h3 className="mt-5 font-bold text-orange-950">Employer jobs ({employerJobs.length})</h3><div className="mt-2 space-y-3">{employerJobs.map((job)=><div key={job.id} className="rounded-xl bg-white p-4"><b>{job.title}</b><p className="text-sm text-slate-600">{job.company_name} · {job.location} · {job.employer_status}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>moderateEmployerJob(job.id,"approve")} className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={()=>moderateEmployerJob(job.id,"reject")} className="rounded bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">Reject</button><button onClick={()=>moderateEmployerJob(job.id,"feature")} className="rounded bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">Feature 7 days</button><button onClick={()=>moderateEmployerJob(job.id,"close")} className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold">Close</button></div></div>)}{!employerJobs.length&&<p className="rounded-xl bg-white p-3 text-sm">No employer jobs waiting for moderation.</p>}</div><div className="mt-5 flex justify-center"><button onClick={()=>setShowEmployerModeration(false)} className="rounded-lg border border-orange-300 bg-white px-5 py-2 font-semibold text-orange-800">Close Employer Moderation</button></div></>}
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <button type="button" onClick={() => setShowGovernmentAgent(!showGovernmentAgent)} className="flex w-full items-center justify-between text-left text-xl font-bold text-emerald-950">
          Government Jobs Agent
          <span>{showGovernmentAgent ? "−" : "+"}</span>
        </button>
        {showGovernmentAgent && (
          <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-emerald-800">Only official .gov.in and .nic.in sources are collected. Every notification needs your approval before publishing.</p>
          </div>
          <button onClick={scanGovernmentSources} disabled={governmentScanning || governmentSources.length === 0} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300 hover:bg-emerald-700">
            {governmentScanning ? "Scanning official sources..." : "Scan official sources"}
          </button>
        </div>

        <form onSubmit={addGovernmentSource} className="mb-5 grid gap-2 md:grid-cols-[1fr_2fr_1fr_auto]">
          <input value={governmentSourceName} onChange={(e) => setGovernmentSourceName(e.target.value)} placeholder="Source name (for example, UPSC)" className="rounded-lg border p-2" required />
          <input type="url" value={governmentSourceUrl} onChange={(e) => setGovernmentSourceUrl(e.target.value)} placeholder="Official source URL ending in .gov.in or .nic.in" className="rounded-lg border p-2" required />
          <input value={governmentSourceState} onChange={(e) => setGovernmentSourceState(e.target.value)} placeholder="State or national" className="rounded-lg border p-2" />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900">Add source</button>
        </form>

        <div className="mb-5 space-y-2">
          {governmentSources.map((source) => (
            <div key={source.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span><b>{source.name}</b> — {source.state === "national" ? "National" : source.state} · {source.url}</span>
              <button onClick={() => removeGovernmentSource(source.id)} className="font-semibold text-red-600 hover:text-red-800">Remove</button>
            </div>
          ))}
          {governmentSources.length === 0 && <p className="rounded-lg bg-white p-3 text-sm text-gray-600">Add official recruitment-notification pages first, then scan them.</p>}
        </div>

        <h3 className="mb-2 font-bold text-emerald-950">Notifications waiting for review ({governmentDrafts.length})</h3>
        {governmentDrafts.length > 0 && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-100/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-950">
              <input type="checkbox" checked={selectedGovernmentDraftIds.length === governmentDrafts.length} onChange={toggleAllGovernmentDrafts} className="h-4 w-4 accent-emerald-600" />
              Select all openings
            </label>
            <button type="button" onClick={approveSelectedGovernmentDrafts} disabled={!selectedGovernmentDraftIds.length || bulkApprovingGovernment} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300">
              {bulkApprovingGovernment ? "Publishing selected openings..." : `Approve selected (${selectedGovernmentDraftIds.length})`}
            </button>
          </div>
        )}
        <div className="space-y-3">
          {governmentDrafts.map((draft) => (
            <div key={draft.id} className="rounded-xl bg-white p-4 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={selectedGovernmentDraftIds.includes(draft.id)} onChange={() => toggleGovernmentDraftSelection(draft.id)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" aria-label={`Select ${draft.title}`} />
                <span className="font-semibold text-gray-900">{draft.title}</span>
              </label>
              <p className="mt-1 text-sm text-gray-600">Source: {draft.source_name}</p>
              <a href={draft.apply_link} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-600 underline">Open official notification</a>
              <div className="mt-3 flex gap-2">
                <button onClick={() => reviewGovernmentDraft(draft.id, "approve")} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Approve & publish</button>
                <button onClick={() => reviewGovernmentDraft(draft.id, "dismiss")} className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300">Dismiss</button>
              </div>
            </div>
          ))}
          {governmentDrafts.length === 0 && <p className="rounded-lg bg-white p-3 text-sm text-gray-600">No new government job notifications are waiting for review.</p>}
        </div>
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setShowGovernmentAgent(false)} className="rounded-lg border border-emerald-300 bg-white px-5 py-2 font-semibold text-emerald-800 transition hover:bg-emerald-100">
            Close Government Jobs Agent
          </button>
        </div>
          </>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
        <button type="button" onClick={() => setShowVisaAgent(!showVisaAgent)} className="flex w-full items-center justify-between text-left text-xl font-bold text-violet-950">
          🌍 Visa Jobs Agent <span>{showVisaAgent ? "−" : "+"}</span>
        </button>
        {showVisaAgent && <>
          <div className="mb-4 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-violet-800">Official public resources and specialist visa-job sources are scanned separately. Only openings with clear visa wording are added for review.</p>
            <button onClick={scanVisaSources} disabled={visaScanning || !visaSources.length} className="rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300">{visaScanning ? "Scanning sponsored jobs..." : "Scan visa resources"}</button>
          </div>
          <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visaSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white p-3 text-sm text-violet-900 shadow-sm hover:ring-2 hover:ring-violet-300"><b>{source.name}</b><span className="block text-xs text-gray-500">{source.country.toUpperCase()} · Job resource ↗</span></a>)}
          </div>
          <h3 className="mb-2 font-bold text-violet-950">Visa openings waiting for review ({visaDrafts.length})</h3>
          <div className="space-y-3">
            {visaDrafts.map((draft) => <div key={draft.id} className="rounded-xl bg-white p-4 shadow-sm"><p className="font-semibold text-gray-900">{draft.title}</p><p className="mt-1 text-sm text-violet-700">Visa Job · {draft.source_name} · {draft.country.toUpperCase()}</p><a href={draft.apply_link} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-600 underline">Open official listing</a><div className="mt-3 flex gap-2"><button onClick={() => reviewVisaDraft(draft.id, "approve")} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Approve & publish</button><button onClick={() => reviewVisaDraft(draft.id, "dismiss")} className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300">Dismiss</button></div></div>)}
            {!visaDrafts.length && <p className="rounded-lg bg-white p-3 text-sm text-gray-600">No verified sponsored openings are waiting for review.</p>}
          </div>
          <div className="mt-5 flex justify-center"><button type="button" onClick={() => setShowVisaAgent(false)} className="rounded-lg border border-violet-300 bg-white px-5 py-2 font-semibold text-violet-800 hover:bg-violet-100">Close Visa Jobs Agent</button></div>
        </>}
      </section>

      <section className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
        <button type="button" onClick={() => setShowCompanyAgent(!showCompanyAgent)} className="flex w-full items-center justify-between text-left text-xl font-bold text-blue-950">
          Company Jobs Agent
          <span>{showCompanyAgent ? "−" : "+"}</span>
        </button>
        {showCompanyAgent && (
          <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-blue-800">Add only verified official company careers pages. Every opening stays in review until you approve it.</p>
          </div>
          <button onClick={scanCompanySources} disabled={companyScanning || companySources.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300 hover:bg-blue-700">
            {companyScanning ? "Scanning company sources..." : "Scan company sources"}
          </button>
        </div>

        <form onSubmit={addCompanySource} className="mb-5 grid gap-2 md:grid-cols-[1fr_2fr_150px_auto]">
          <input value={companySourceName} onChange={(e) => setCompanySourceName(e.target.value)} placeholder="Company name (for example, TCS)" className="rounded-lg border p-2" required />
          <input type="url" value={companySourceUrl} onChange={(e) => setCompanySourceUrl(e.target.value)} placeholder="Verified HTTPS company careers page" className="rounded-lg border p-2" required />
          <select value={companySourceCategory} onChange={(e) => setCompanySourceCategory(e.target.value)} className="rounded-lg border p-2">
            <option value="Private">Private company</option>
            <option value="Government">PSU / public-sector</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900">Add source</button>
        </form>

        <div className="mb-5 space-y-2">
          {companySources.map((source) => (
            <div key={source.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span><b>{source.name}</b> ({source.job_category}) — {source.url}</span>
              <button onClick={() => removeCompanySource(source.id)} className="font-semibold text-red-600 hover:text-red-800">Remove</button>
            </div>
          ))}
          {companySources.length === 0 && <p className="rounded-lg bg-white p-3 text-sm text-gray-600">Add an official company careers page first, then scan it.</p>}
        </div>

        <h3 className="mb-2 font-bold text-blue-950">Company openings waiting for review ({companyDrafts.length})</h3>
        {companyDrafts.length > 0 && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-100/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-950">
              <input type="checkbox" checked={selectedCompanyDraftIds.length === companyDrafts.length} onChange={toggleAllCompanyDrafts} className="h-4 w-4 accent-blue-600" />
              Select all openings
            </label>
            <button type="button" onClick={approveSelectedCompanyDrafts} disabled={!selectedCompanyDraftIds.length || bulkApprovingCompany} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300">
              {bulkApprovingCompany ? "Publishing selected openings..." : `Approve selected (${selectedCompanyDraftIds.length})`}
            </button>
          </div>
        )}
        <div className="space-y-3">
          {companyDrafts.map((draft) => (
            <div key={draft.id} className="rounded-xl bg-white p-4 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={selectedCompanyDraftIds.includes(draft.id)} onChange={() => toggleCompanyDraftSelection(draft.id)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" aria-label={`Select ${draft.title}`} />
                <span className="font-semibold text-gray-900">{draft.title}</span>
              </label>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span>{draft.source_name} · {draft.job_category}</span>
                {draft.visa_sponsorship && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">Visa detected</span>}
              </p>
              <a href={draft.apply_link} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-600 underline">Open official company listing</a>
              <div className="mt-3 flex gap-2">
                <button onClick={() => reviewCompanyDraft(draft.id, "approve")} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Approve & publish</button>
                <button onClick={() => reviewCompanyDraft(draft.id, "dismiss")} className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300">Dismiss</button>
              </div>
            </div>
          ))}
          {companyDrafts.length === 0 && <p className="rounded-lg bg-white p-3 text-sm text-gray-600">No new company openings are waiting for review.</p>}
        </div>
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setShowCompanyAgent(false)} className="rounded-lg border border-blue-300 bg-white px-5 py-2 font-semibold text-blue-800 transition hover:bg-blue-100">
            Close Company Jobs Agent
          </button>
        </div>
          </>
        )}
      </section>

      {role === "superadmin" && (
  <>
    <h1 className="text-2xl font-bold mb-4">🛡 Admin Requests</h1>

    {adminRequests.length === 0 ? (
      <p>No pending admin requests</p>
    ) : (
      adminRequests.map(req => (
        <div
          key={req.id}
          className="bg-white p-4 rounded-lg shadow mb-3 border"
        >
          <p><b>Name:</b> {req.username}</p>
          <p><b>Email:</b> {req.email}</p>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => approveAdmin(req.id)}
              className="bg-green-500 text-white px-3 py-1 rounded"
            >
              Approve
            </button>

            <button
              onClick={() => rejectAdmin(req.id)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Reject
            </button>
          </div>
        </div>
      ))
    )}
  </>
)}

      {/* 🔹 JOBS SECTION */}
      <h1 className="text-2xl font-bold mb-4">💼 Jobs Section</h1>

      <section className="mb-8">
        <button type="button" onClick={() => setShowPostedJobs(!showPostedJobs)} className="mb-4 flex w-full items-center justify-between rounded-xl bg-white p-4 text-left text-lg font-bold text-gray-800 shadow hover:bg-gray-50">
          Posted Jobs ({jobs.length})
          <span>{showPostedJobs ? "−" : "+"}</span>
        </button>
        {showPostedJobs && (
          <>
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-4 shadow sm:flex-row">
          <input type="search" value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} placeholder="Search by job title, company or location" className="min-w-0 flex-1 rounded-lg border p-2" />
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="rounded-lg border p-2">
            <option value="all">All posted jobs</option>
            <option value="accepting">Accepting applications</option>
            <option value="closed">Applications closed</option>
          </select>
        </div>

        {filteredJobs.map((job) => {
          const acceptsApplications = job.apply_enabled !== false || Boolean(job.apply_link || job.applyLink);
          return (
            <div key={job.id} className="mb-3 flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.company} · {job.location}</p>
                <p className={`mt-1 text-xs font-semibold ${acceptsApplications ? "text-green-700" : "text-amber-700"}`}>
                  {acceptsApplications ? (job.apply_link ? "Company apply link active" : "Internal applications active") : "Applications closed"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditingJob(job)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Edit</button>
                <button onClick={() => handleJobDelete(job.id)} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600">Delete</button>
              </div>
            </div>
          );
        })}
        {filteredJobs.length === 0 && <p className="rounded-lg bg-white p-4 text-gray-500 shadow">No posted jobs match this filter.</p>}
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setShowPostedJobs(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2 font-semibold text-gray-700 transition hover:bg-gray-100">
            Close Posted Jobs
          </button>
        </div>
          </>
        )}
      </section>

      {editingJob && (
        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Edit Job: {editingJob.title}</h2>
            <button type="button" onClick={() => setEditingJob(null)} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          </div>
          <form onSubmit={saveEditedJob} className="space-y-3">
            {[['title', 'Job Title'], ['company', 'Company'], ['location', 'Location'], ['salary', 'Salary'], ['experience', 'Experience'], ['skills', 'Skills'], ['type', 'Job Type']].map(([field, label]) => (
              <input key={field} type="text" placeholder={label} value={editingJob[field] || ""} onChange={(e) => setEditingJob({ ...editingJob, [field]: e.target.value })} className="w-full rounded border p-2" />
            ))}
            <select value={editingJob.mode || ""} onChange={(e) => setEditingJob({ ...editingJob, mode: e.target.value })} className="w-full rounded border p-2">
              <option value="">Work mode: Not set</option>
              <option value="Onsite">Onsite</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Visa">Visa Jobs</option>
            </select>
            <select value={editingJob.jobCategory || ""} onChange={(e) => setEditingJob({ ...editingJob, jobCategory: e.target.value })} className="w-full rounded border p-2">
              <option value="">Job sector: Not set</option>
              <option value="Private">Private job</option>
              <option value="Government">Government job</option>
            </select>
            <label className="block text-sm font-semibold text-gray-700">
              Last date to apply
              <input type="date" value={editingJob.last_date || editingJob.lastDate || ""} onChange={(e) => setEditingJob({ ...editingJob, lastDate: e.target.value, last_date: e.target.value })} className="mt-1 w-full rounded border p-2" />
            </label>
            <textarea placeholder="Job Description" value={editingJob.description || ""} maxLength={3000} rows="7" onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })} className="w-full rounded border p-2" />
            <p className="text-right text-xs text-gray-500">{(editingJob.description || "").length}/3000 characters</p>
            <label className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
              <input type="checkbox" checked={editingJob.applyEnabled} onChange={(e) => setEditingJob({ ...editingJob, applyEnabled: e.target.checked })} className="h-4 w-4 accent-blue-600" />
              Enable internal Apply button for this job
            </label>
            {!editingJob.applyEnabled && <input type="url" placeholder="Company application link (https://...)" value={editingJob.applyLink || ""} onChange={(e) => setEditingJob({ ...editingJob, applyLink: e.target.value })} className="w-full rounded border p-2" />}
            <button type="submit" className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700">Save Changes</button>
          </form>
        </section>
      )}

      

      {/* 🔹 ADD JOB CARD */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">➕ Add Job</h2>

        <form onSubmit={addJob}>
          <input
            type="text"
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Salary"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Job Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <select
            value={jobCategory}
            onChange={(e) => setJobCategory(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          >
            <option value="">Select job sector</option>
            <option value="Private">Private job</option>
            <option value="Government">Government job</option>
          </select>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          >
            <option value="">Select work mode</option>
            <option value="Onsite">Onsite</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Visa">Visa Jobs</option>
          </select>

          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <label className="mb-3 block text-sm font-semibold text-gray-700">
            Country where this job is available
            <select value={jobCountry} onChange={(e) => setJobCountry(e.target.value)} className="mt-1 border p-2 rounded w-full">
              {COUNTRIES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>

          <label className="mb-3 block text-sm font-semibold text-gray-700">
            Last date to apply
            <input
              type="date"
              value={lastDate}
              onChange={(e) => setLastDate(e.target.value)}
              className="mt-1 border p-2 rounded w-full"
            />
          </label>

          <textarea
  placeholder="Job Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxLength={3000}
  rows="6"
  className="border p-2 rounded w-full mb-1"
/>
          <p className="mb-3 text-right text-xs text-gray-500">{description.length}/3000 characters</p>

          <label className="mb-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
            <input
              type="checkbox"
              checked={applyEnabled}
              onChange={(e) => setApplyEnabled(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Enable Apply button for this job
          </label>

          {!applyEnabled && (
            <input
              type="url"
              placeholder="Company application link (https://...)"
              value={applyLink}
              onChange={(e) => setApplyLink(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
          )}

          <h3 className="font-semibold mb-2">Chatbot Questions</h3>

{questions.map((q, index) => (
  <input
    key={index}
    type="text"
    placeholder={`Question ${index + 1}`}
    value={q}
    onChange={(e) => {
      const newQ = [...questions];
      newQ[index] = e.target.value;
      setQuestions(newQ);
    }}
    className="border p-2 rounded w-full mb-2"
  />
))}

<button
  type="button"
  onClick={() => setQuestions([...questions, ""])}
  className="bg-gray-300 px-3 py-1 rounded mb-3"
>
  + Add Question
</button>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Job
          </button>
        </form>
      </div>

      {/* 🔹 APPLICATIONS SECTION */}
      <h1 className="text-2xl font-bold mb-4 mt-10">
  
  📋 Applications ({filteredApplications.length})
  
  
</h1>

<div className="flex flex-wrap gap-3 mb-4">

  {/* STATUS FILTER */}
  <div className="flex gap-2 items-center">
  <span className="text-sm font-semibold">Status:</span>

  <button onClick={() => setFilterStatus("all")}
    className={`px-3 py-1 rounded ${filterStatus==="all"?"bg-blue-600 text-white":"bg-gray-200"}`}>
    All
  </button>

  <button onClick={() => setFilterStatus("Approved")}
    className={`px-3 py-1 rounded ${filterStatus==="Approved"?"bg-green-600 text-white":"bg-gray-200"}`}>
    Approved
  </button>

  <button onClick={() => setFilterStatus("Rejected")}
    className={`px-3 py-1 rounded ${filterStatus==="Rejected"?"bg-red-600 text-white":"bg-gray-200"}`}>
    Rejected
  </button>

  <button onClick={() => setFilterStatus("Pending")}
    className={`px-3 py-1 rounded ${filterStatus==="Pending"?"bg-yellow-500 text-white":"bg-gray-200"}`}>
    Pending
  </button>

  </div>


  {/* SHORTLIST FILTER */}
  <div className="flex gap-2 items-center mt-2">
  <span className="text-sm font-semibold">Type:</span>

  <button onClick={() => setFilterType("shortlisted")}
    className={`px-3 py-1 rounded ${filterType==="shortlisted"?"bg-purple-600 text-white":"bg-gray-200"}`}>
    ⭐ Shortlisted
  </button>

  </div>
  

  <button
  onClick={() => {
    setFilterStatus("all");
    setFilterType("all");
  }}
  className="px-3 py-1 rounded bg-blue-600 text-white"
>
  Reset
</button>

  
</div>

<button
  onClick={() => navigate("/admin/candidates")}
  className="px-4 py-2 rounded-xl font-medium transition-all duration-300
  hover:bg-blue-600 hover:text-white hover:scale-105"
>
  Candidate Directory
</button>

<button
  onClick={() => navigate("/profile")}
  className="px-4 py-2 rounded-xl font-medium transition-all duration-300
  hover:bg-blue-600 hover:text-white hover:scale-105"
>
  👤 Profile
</button>

      <button
        onClick={handleLogout}
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 mb-6"
      >
        Logout
      </button>

      <button
  onClick={() => navigate("/")}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-2"
>
  🏠 Home
</button>

      <button
  onClick={deleteAllApplications}
  className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 ml-2"
>
  🗑 Delete All
</button>

      {(applications || []).length === 0 ? (
  <p>No applications yet</p>
) : (
  <>
    {(filteredApplications || []).map(app => {
      const hasAnswers = answersMap?.[app.id] || false;


  return (
    <div
      key={app.id}
      className="bg-white shadow-md rounded-lg p-5 mb-4 border"
    >
            <p><b>Name:</b> {app.name}</p>
            {(shortlisted || []).find(item => item.id === app.id) && (
  <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
  ✔ Shortlisted
</span>
)}
            <p><b>Email:</b> {app.email}</p>
            <p><b>Job ID:</b> {app.jobId}</p>

           <p className="mb-2">
  <b>Status:</b>{" "}
  <span
    className={`ml-2 px-2 py-1 rounded text-white text-sm font-semibold ${
      app.status === "Approved"
        ? "bg-green-500"
        : app.status === "Rejected"
        ? "bg-red-500"
        : "bg-yellow-500"
    }`}
  >
    {app.status || "Pending"}
  </span>
</p>

            <div className="mt-2 flex gap-2">
  <button
    onClick={() => updateStatus(app.id, "Approved")}
    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
  >
    Approve
  </button>

  <button
    onClick={() => updateStatus(app.id, "Rejected")}
    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
  >
    Reject
  </button>

  

<button
  title={
    !hasAnswers
      ? "No answers yet"
      : loadingMap[app.id]
      ? "Loading..."
      : "View answers"
  }
  onClick={() => {
    if (activeChatId === app.id) {
      setActiveChatId(null); // close
    } else {
      setActiveChatId(app.id); // open
      fetchChat(app.id); // load data
    }
  }}
  disabled={!hasAnswers || loadingMap?.[app.id]}
  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
    ${
      hasAnswers
        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:scale-105 shadow-md"
        : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
    }
  `}
>
  {loadingMap[app.id] ? "⏳ Loading..." : "📊 View Answers"}

  {/* 🔥 COUNT BADGE */}
  {hasAnswers && !loadingMap[app.id] && (
    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
      {(countMap?.[app.id] || 0) > 0
  ? `${countMap[app.id]} Answers`
  : "No answers"}
    </span>
  )}
</button>
</div>

{activeChatId === app.id && (
  <div className="mt-4 bg-gray-100 p-4 rounded-lg w-full transition-all duration-300 animate-fadeIn">
    {chatData.map((item, i) => (
      <div key={i} className="mb-2">
        <p><b>Q:</b> {item.question}</p>
        <p><b>A:</b> {item.answer}</p>
      </div>
    ))}
  </div>
)}


            <div className="mt-3 flex gap-3 flex-wrap">

{app.resume ? (
  <a
    href={
  app.resume.startsWith("http")
    ? app.resume
    : `https://humorous-fulfillment-production-1f5e.up.railway.app/uploads/${app.resume}`
}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow hover:scale-105 transition"
  >
    📄 View Resume
  </a>
) : (
  <span className="text-gray-400 mt-2 inline-block">
    No Resume ❌
  </span>
)}

            <button
  onClick={() => handleDelete(app.id)}
  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
>
  Delete
</button>

<button
  onClick={() => addToShortlist(app)}
  disabled={(shortlisted || []).find(item => item.id === app.id)}
  className={`px-3 py-1 rounded text-white ml-2 ${
    shortlisted.find(item => item.id === app.id)
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-500 hover:bg-blue-600"
  }`}
>
  {shortlisted.find(item => item.id === app.id)
    ? "✔ Shortlisted"
    : "⭐ Shortlist"}
</button>
          </div>
          </div>
        );
    })}
  </>
)}
      

<h1 className="text-2xl font-bold mt-10 mb-4">
  ⭐ Shortlisted ({shortlisted.length})
</h1>

<button
  onClick={() => setShortlisted([])}
  className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
>
  Clear All ❌
</button>

{shortlisted.length === 0 ? (
  <p className="text-gray-500">No shortlisted candidates yet</p>
) : (
  shortlisted.map(app => (
    <div
      key={app.id}
      className="bg-white shadow-md rounded-lg p-4 mb-4 border"
    >
      <p><b>Name:</b> {app.name}</p>
      {(shortlisted || []).find(item => item.id === app.id) && (
  <span className="ml-2 text-green-600 font-bold">
    ✔ Shortlisted
  </span>
)}
      <p><b>Email:</b> {app.email}</p>
      <p><b>Job ID:</b> {app.jobId}</p>

      <button
        onClick={() => removeFromShortlist(app.id)}

        className="mt-2 px-3 py-1 bg-red-500 text-white rounded"
      >
        Remove ❌
      </button>

      
    </div>
    

    
  ))
)}


    </div>

  </div>
  
);
}



export default AdminDashboard;
