import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; 
import React, { useState } from "react";

function Signup() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    

    const res = await fetch(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
      username,
      email,
      password,
      adminSecret   // ✅ IMPORTANT
        })
      }
    );

    const data = await res.json();
if (res.ok) {
  toast.success("Signup successful 🎉");

  setTimeout(() => {
    navigate("/login");
  }, 1500); // small delay so user sees toast
}
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">

    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Create Account 🚀
      </h2>

      <form onSubmit={handleSignup} className="space-y-4">

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={() => setIsAdmin(!isAdmin)}
          />
          Signup as Admin (Post Jobs)
        </label>

        {isAdmin && (
          <input
            type="text"
            placeholder="Enter Admin Secret"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
        >
          Signup
        </button>

      </form>

      <form onSubmit={handleSignup} className="space-y-4">
  ...
</form>

{/* ✅ ADD HERE */}
<p className="text-sm text-center text-gray-500 mt-4">
  Already have an account?
  <span
    onClick={() => navigate("/login")}
    className="text-blue-600 cursor-pointer ml-1 hover:underline font-medium"
  >
    Login
  </span>
</p>

    </div>

  </div>
);
}

export default Signup;