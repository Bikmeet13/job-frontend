import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [approvalPending, setApprovalPending] = useState(false);
  
  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const res = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/login",
      {
        email,
        password
      }
    );

    const { token, role } = res.data; // ✅ ADD THIS

    if (token) {
      localStorage.setItem("token", token);
       localStorage.setItem("role", role);

      if (role === "superadmin") {
  navigate("/admin"); // approval panel
} 
else if (role === "admin") {
 navigate("/admin"); // normal admin dashboard
} 
else {
  alert("Not authorized ❌");
}
    }

  } catch (err) {
  console.log(err);

  const message = err?.response?.data?.error || "";

  if (message.includes("approval")) {
    setApprovalPending(true);
  } else {
    toast.error(message || "Login failed ❌");
  }
}
};

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Admin Login</h1>
      {approvalPending && (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">

      <div className="flex justify-center mb-4">
        <div className="bg-yellow-100 p-5 rounded-full animate-bounce">
          <ShieldCheck size={40} className="text-yellow-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800">
        Approval Pending
      </h2>

      <p className="mt-3 text-gray-600">
        Your admin account has been created successfully.
        A super admin is reviewing your request.
      </p>

      <div className="mt-6 flex justify-center items-center gap-3 text-yellow-600">
        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
        Processing Request...
      </div>

      <button
        onClick={() => {
          setApprovalPending(false);
          navigate("/");
        }}
        className="mt-8 w-full bg-blue-600 text-white py-3 rounded-2xl hover:bg-blue-700 transition"
      >
        Back to Home
      </button>

    </div>
  </div>
)}

      <form onSubmit={handleLogin}>
        <input
  type="email"
  placeholder="Email"
  onChange={(e) => setEmail(e.target.value)}
/><br /><br />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />

        <p
    onClick={() => navigate("/forgot-password")}
    style={{ cursor: "pointer", color: "blue", marginBottom: "10px" }}
  >
    Forgot Password?
  </p>

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default AdminLogin;