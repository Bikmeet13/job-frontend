import axios from "axios";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const res = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/login",
      { email, password }
    );

    const { token, role, userId } = res.data;

    console.log("ROLE:", role);
    console.log("USER ID:", userId);

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId); // ✅ IMPORTANT

    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    alert(err.response?.data?.error || "Login failed");
  }
};

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
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

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;