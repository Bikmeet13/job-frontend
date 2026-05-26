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

import { Toaster } from "react-hot-toast";
import { Routes, Route } from "react-router-dom";

function App() {
  return (<>
      <Toaster position="top-right" />

    <Routes>

      <Route path="/apply/:jobId" element={<ApplyForm />} />

      <Route path="/" element={<Jobs />} />

      <Route path="/jobs/:id" element={<JobDetails />} />

      <Route path="/saved-jobs" element={<SavedJobs />} />

      <Route path="/profile" element={<Profile />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      

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

       
    </>
  );
}

export default App;