import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();

  setLoading(true);

  try {
    const res = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/login",
      { email, password }
    );

    const { token, role, userId, username } = res.data;

   localStorage.setItem("username", username || email);
    localStorage.setItem("email", email);
    
    console.log("USERNAME:", username);


    console.log("ROLE:", role);
    console.log("USER ID:", userId);
    console.log("FULL RESPONSE:", res.data);

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId);
    
     toast.success("Login successful 🚀");
     
    setTimeout(() => {
      if (role === "user") {
  navigate("/");
} else {
  alert("Use admin login ❌");
}
    }, 1000);

 } catch (err) {
  console.log("LOGIN ERROR:", err);

  const message =
    err?.response?.data?.error ||
    err?.message ||
    "Login failed ❌";

  toast.error(message);
  
}
 setLoading(false); // ✅ IMPORTANT
};


 return (
  <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">

    {/* SVG Doodle Background */}
    <div className="absolute inset-0 opacity-5 pointer-events-none">
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="100"
          cy="100"
          r="50"
          stroke="blue"
          fill="none"
          strokeWidth="3"
        />

        <circle
          cx="400"
          cy="200"
          r="70"
          stroke="purple"
          fill="none"
          strokeWidth="3"
        />

        <path
          d="M100 300 Q300 100 500 300"
          stroke="blue"
          fill="none"
          strokeWidth="3"
        />
      </svg>
    </div>

    <div
      className="relative z-10 flex flex-col items-center justify-center min-h-screen"
    >
      <h1
      onClick={() => navigate("/")}
      className="cursor-pointer text-3xl font-bold text-blue-600 mb-6 hover:text-blue-800"
    >
      🏠 Job Portal
    </h1>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
  type="email"
  placeholder="example@gmail.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="border p-3 rounded-lg w-full max-w-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
/>

        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <br /><br />

        <p
  onClick={() => navigate("/forgot-password")}
  style={{ cursor: "pointer", color: "blue", marginBottom: "10px" }}
>
  Forgot Password?
</p>

        <button
  type="submit"
  disabled={loading}
  className={`px-6 py-2 rounded-lg font-semibold ${
    loading
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-600 text-white hover:bg-blue-700"
  }`}
>
  {loading ? "Logging in..." : "Login"}
</button>


<p
  onClick={() => navigate("/admin-login")}
  style={{ cursor: "pointer", color: "green", marginTop: "10px" }}
>
  Login as Admin
</p>

      </form>

      <button
  onClick={() => navigate("/")}
  className="mt-4 text-blue-600 underline hover:text-blue-800"
>
  ⬅ Back to Home
</button>

        </div>

  </div>
);
}

export default Login;