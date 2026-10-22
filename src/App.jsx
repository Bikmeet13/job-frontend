import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import Jobs from "./pages/Jobs";
import GlexaAssistant from "./components/GlexaAssistant";
import { Toaster } from "react-hot-toast";
import { Routes, Route } from "react-router-dom";

// Only the public Jobs screen is part of the initial download. The remaining
// dashboards and tools load only when a visitor opens their route.
const ApplyForm = lazy(() => import("./components/ApplyForm"));
const AdminApplications = lazy(() => import("./pages/AdminApplications"));
const Profile = lazy(() => import("./pages/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SavedJobs = lazy(() => import("./pages/SavedJobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const ChatbotForm = lazy(() => import("./components/ChatbotForm"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCandidates = lazy(() => import("./pages/AdminCandidates"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const DocumentGenerator = lazy(() => import("./pages/DocumentGenerator"));
const EmployerLanding = lazy(() => import("./pages/EmployerLanding"));
const EmployerAuth = lazy(() => import("./pages/EmployerAuth"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const EmployerPostJob = lazy(() => import("./pages/EmployerPostJob"));
const EmployerProfile = lazy(() => import("./pages/EmployerProfile"));
const EmployerApplications = lazy(() => import("./pages/EmployerApplications"));
const EmployerHRServices = lazy(() => import("./pages/EmployerHRServices"));
const EmployerLeaveApprovals = lazy(() => import("./pages/EmployerLeaveApprovals"));
const EmployerDocumentRequests = lazy(() => import("./pages/EmployerDocumentRequests"));
const MarketlencePeopleCRM = lazy(() => import("./pages/MarketlencePeopleCRM"));
const TelephonyCRM = lazy(() => import("./pages/TelephonyCRM"));
const EmployeePortal = lazy(() => import("./pages/EmployeePortal"));
const CandidateJobAlerts = lazy(() => import("./pages/CandidateJobAlerts"));
const CandidateOnboarding = lazy(() => import("./pages/CandidateOnboarding"));
const LegalPolicies = lazy(() => import("./pages/LegalPolicies"));
const FreelanceLanding = lazy(() => import("./pages/FreelanceLanding"));
const FreelanceHire = lazy(() => import("./pages/FreelanceHire"));
const FreelanceWork = lazy(() => import("./pages/FreelanceWork"));

function App() {
  return (<>
      <Toaster position="top-right" />

    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
    <Routes>

      <Route path="/apply/:jobId" element={<ProtectedRoute><ApplyForm /></ProtectedRoute>} />

      <Route path="/" element={<Jobs />} />
      <Route path="/jobs" element={<Jobs />} />

      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/employers" element={<EmployerLanding />} />
      <Route path="/employer/register" element={<EmployerAuth />} />
      <Route path="/employer/login" element={<EmployerAuth login />} />
      <Route path="/employer/dashboard" element={<EmployerDashboard />} />
      <Route path="/employer/post-job" element={<EmployerPostJob />} />
      <Route path="/employer/profile" element={<EmployerProfile />} />
      <Route path="/employer/applications" element={<EmployerApplications />} />
      <Route path="/employer/hr" element={<EmployerHRServices />} />
      <Route path="/employer/hr/leave-approvals" element={<EmployerLeaveApprovals />} />
      <Route path="/employer/hr/document-requests" element={<EmployerDocumentRequests />} />
      <Route path="/employee/login" element={<EmployeePortal />} />
      <Route path="/admin/people" element={<ProtectedRoute><MarketlencePeopleCRM /></ProtectedRoute>} />
      <Route path="/admin/calling" element={<ProtectedRoute><TelephonyCRM /></ProtectedRoute>} />
      <Route path="/candidate/job-alerts" element={<ProtectedRoute><CandidateJobAlerts /></ProtectedRoute>} />
      <Route path="/candidate/welcome" element={<ProtectedRoute><CandidateOnboarding /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<LegalPolicies />} />
      <Route path="/terms-and-conditions" element={<LegalPolicies />} />
      <Route path="/refund-cancellation-policy" element={<LegalPolicies />} />
      <Route path="/return-refund-policy" element={<LegalPolicies />} />
      <Route path="/cancellation-policy" element={<LegalPolicies />} />
      <Route path="/shipping-policy" element={<LegalPolicies />} />
      <Route path="/about-us" element={<LegalPolicies />} />
      <Route path="/services-pricing" element={<LegalPolicies />} />
      <Route path="/contact-us" element={<LegalPolicies />} />
      <Route path="/freelance" element={<ProtectedRoute><FreelanceLanding /></ProtectedRoute>} />
      <Route path="/freelance/hire" element={<ProtectedRoute><FreelanceHire /></ProtectedRoute>} />
      <Route path="/freelance/work" element={<ProtectedRoute><FreelanceWork /></ProtectedRoute>} />

      <Route path="/saved-jobs" element={<ProtectedRoute><SavedJobs /></ProtectedRoute>} />

      <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>

<Route path="/forgot-password" element={<ForgotPassword />} />

<Route path="/resume-builder" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
<Route path="/document-generator" element={<ProtectedRoute><DocumentGenerator /></ProtectedRoute>} />

      

      <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

<Route path="/chatbot" element={<ProtectedRoute><ChatbotForm /></ProtectedRoute>} />

<Route
  path="/admin/candidates"
  element={
    <ProtectedRoute>
      <AdminCandidates />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin-applications"
  element={
    <ProtectedRoute>
      <AdminApplications />
    </ProtectedRoute>
  }
/>

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route path="/admin-login" element={<AdminLogin />} />

           <Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>


    </Routes>
    </Suspense>
    <GlexaAssistant />

       
    </>
  );
}

export default App;
