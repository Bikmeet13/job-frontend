import ApplyForm from "./components/ApplyForm";
import AdminApplications from "./pages/AdminApplications";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import SavedJobs from "./pages/SavedJobs";
import JobDetails from "./pages/JobDetails";
import ChatbotForm from "./components/ChatbotForm";
import ForgotPassword from "./pages/ForgotPassword";

import Jobs from "./pages/Jobs";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCandidates from "./pages/AdminCandidates";
import ResumeBuilder from "./pages/ResumeBuilder";
import DocumentGenerator from "./pages/DocumentGenerator";
import EmployerLanding from "./pages/EmployerLanding";
import EmployerAuth from "./pages/EmployerAuth";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerPostJob from "./pages/EmployerPostJob";
import EmployerProfile from "./pages/EmployerProfile";
import EmployerApplications from "./pages/EmployerApplications";
import CandidateJobAlerts from "./pages/CandidateJobAlerts";
import LegalPolicies from "./pages/LegalPolicies";
import { Toaster } from "react-hot-toast";
import { Routes, Route } from "react-router-dom";

function App() {
  return (<>
      <Toaster position="top-right" />

    <Routes>

      <Route path="/apply/:jobId" element={<ApplyForm />} />

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
      <Route path="/candidate/job-alerts" element={<CandidateJobAlerts />} />
      <Route path="/privacy-policy" element={<LegalPolicies />} />
      <Route path="/terms-and-conditions" element={<LegalPolicies />} />
      <Route path="/refund-cancellation-policy" element={<LegalPolicies />} />
      <Route path="/return-refund-policy" element={<LegalPolicies />} />
      <Route path="/cancellation-policy" element={<LegalPolicies />} />
      <Route path="/shipping-policy" element={<LegalPolicies />} />
      <Route path="/about-us" element={<LegalPolicies />} />
      <Route path="/services-pricing" element={<LegalPolicies />} />
      <Route path="/contact-us" element={<LegalPolicies />} />

      <Route path="/saved-jobs" element={<SavedJobs />} />

      <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>

<Route path="/forgot-password" element={<ForgotPassword />} />

<Route path="/resume-builder" element={<ResumeBuilder />} />
<Route path="/document-generator" element={<DocumentGenerator />} />

      

      <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

<Route path="/chatbot" element={<ChatbotForm />} />

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

<Route path="/saved-jobs" element={<SavedJobs />} />

    </Routes>

       
    </>
  );
}

export default App;
