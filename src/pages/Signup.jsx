import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import React, { useState } from "react";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const navigate = useNavigate();

  const sendOtp = async () => {
  console.log("CLICKED");
  console.log("EMAIL:", email);

  if (!email) {
    alert("Please enter email");
    return;
  }

  try {
    const res = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/send-email-otp",
      { email }
    );

    console.log("SUCCESS:", res.data);
    setOtpSent(true);
    toast.success("OTP sent 📩");

  } catch (err) {
  console.log("FULL ERROR:", err.response?.data); // 🔥 IMPORTANT
  toast.error(err.response?.data?.error || "Something failed ❌");
}
};

const verifyOtp = async () => {
  try {
    const res = await axios.post(
      "https://humorous-fulfillment-production-1f5e.up.railway.app/api/verify-email-otp",
      {
        username,
        email,
        password,
        otp,
         isAdmin
      }
    );

    console.log("VERIFY RESPONSE:", res.data);

    toast.success("Signup successful 🎉");
    navigate("/login");
    
  } 
  catch (err) {
  console.log("FULL ERROR:", err.response?.data); // 🔥 ADD THIS
  toast.error(err.response?.data?.error || "Invalid OTP ❌");
}
};

const role = localStorage.getItem("role");

if (role === "superadmin") {
  navigate("/admin"); // approval dashboard
} else if (role === "admin") {
  navigate("/admin-home"); // normal admin dashboard
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        <h2 className="text-3xl font-bold text-center mb-6">
          Create Account 🚀
        </h2>

        <label>
  <input
    type="checkbox"
    checked={isAdmin}
    onChange={() => setIsAdmin(!isAdmin)}
  />
  Signup as Admin
</label>


        {/* USER INPUTS */}
        <input
          type="text"
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />

        <input
  type="email"
  placeholder="Email"
  value={email}
   disabled={otpSent}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full p-3 border rounded-lg mb-3"
/>
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />
        
        {/* SEND OTP */}
        {!otpSent && (
          <button
  type="button"
  onClick={sendOtp}
  disabled={!email}
  className="w-full bg-blue-600 text-white py-3 rounded-xl disabled:bg-gray-400"
>
  Send OTP
</button>

        )}

        {/* VERIFY */}
        {otpSent && (
           <>
    <input
      placeholder="Enter OTP"
      onChange={(e) => setOtp(e.target.value)} 
    />

             <button type="button" onClick={verifyOtp}>
      Verify & Signup
    </button>
  </>
        )}

        {/* LOGIN */}
        <p className="text-sm text-center mt-4">
          Already have an account?
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 cursor-pointer ml-1"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}

export default Signup;