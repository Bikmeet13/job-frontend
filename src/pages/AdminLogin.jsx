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

      if (role === "superadmin") {
  navigate("/admin"); // approval panel
} 
else if (role === "admin") {
  navigate("/admin-home"); // normal admin dashboard
} 
else {
  alert("Not authorized ❌");
}
    }

  } catch (err) {
    console.error(err);
    alert("Server error ❌");
  }
};

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

export default Login;