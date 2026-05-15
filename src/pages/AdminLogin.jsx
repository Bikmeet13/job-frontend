import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  
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

      if (role === "admin") {
        navigate("/admin");
      } else {
        alert("Not an admin ❌");
      }
    }

  } catch (err) {
    console.error(err);
    alert("Server error ❌");
  }
};

function Pending() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          ⏳ Waiting for Admin Approval
        </h1>
        <p className="text-gray-500 mt-2">
          You will be able to login once approved.
        </p>
      </div>
    </div>
  );
}

export default Pending;

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Admin Login</h1>

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

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;