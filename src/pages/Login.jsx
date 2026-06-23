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

      <div
  className="
    bg-white/80 backdrop-blur-lg
    p-10 rounded-3xl shadow-2xl
    border border-white/30
    w-full max-w-md
    hover:shadow-blue-500/20
    transition-all duration-500
  "
>

      <h1
      onClick={() => navigate("/")}
      className="cursor-pointer text-3xl font-bold text-blue-600 mb-6 hover:text-blue-800 text-center"
    >
      
      🚀 Marketlence Jobs
    </h1>
      <h2 className="text-2xl font-bold text-center mb-6">
  Welcome Back 👋
</h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
  type="email"
  placeholder="example@gmail.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="border p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
/>

        <input
  type="password"
  placeholder="Enter your password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  className="border p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
/>

        

       <p
  onClick={() => navigate("/forgot-password")}
  className="
    cursor-pointer text-blue-600 font-medium
    transition-all duration-300
    hover:text-blue-800 hover:underline
  "
>
  Forgot Password?
  </p>

  <p
  onClick={() => navigate("/signup")}
  className="
    text-center text-gray-600 cursor-pointer
    hover:text-blue-600 transition-all duration-300
  "
>
  Don't have an account? Sign Up
</p>



        <button
  type="submit"
  disabled={loading}
  className={`
  w-full px-8 py-3 rounded-xl font-semibold text-white
  transition-all duration-300 ease-in-out
  ${
    loading
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
  }
`}
>
  {loading ? "⏳ Logging in..." : "🚀 Login"}
</button>


<button
  type="button"
  onClick={() => navigate("/admin-login")}
  className="
  w-full mt-4 px-6 py-3 rounded-xl font-medium
  border-2 border-green-500 text-green-600
  transition-all duration-300
  hover:bg-green-500 hover:text-white
  hover:scale-105 hover:shadow-lg
"
>
  🛡️ Login as Admin
</button>

      </form>

      <button
  onClick={() => navigate("/")}
  className="
w-full mt-4 py-3 rounded-xl
bg-gray-100 hover:bg-gray-200
transition-all duration-300
font-medium
"
>
  ⬅ Back to Home
</button>
</div>
</div>
</div>
        

  
);
}

export default Login;