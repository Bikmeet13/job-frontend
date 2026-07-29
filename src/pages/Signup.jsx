import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
    const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isJobAlertsSignup = location.state?.source === "job-alerts";

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/google-login",
        { credential: credentialResponse.credential }
      );

      const { token, role, userId, username, email } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", userId);
      localStorage.setItem("username", username);
      localStorage.setItem("email", email);

      toast.success("Account created with Google");
      navigate("/");
    } catch (err) {
      console.error("Google signup failed", err);
      toast.error("Google signup failed. Please try again.");
    }
  };

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


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        <h2 className="text-3xl font-bold text-center mb-6">
          Create Account 🚀
        </h2>

        {isJobAlertsSignup && (
          <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-medium leading-6 text-blue-800">
            Create your free account to save jobs, build your resume, and get new job alerts by email.
          </p>
        )}

        <div className="mb-5 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google signup failed. Please try again.")}
            text="signup_with"
            shape="rectangular"
            width="300"
          />
        </div>

        <div className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or sign up with email
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={isAdmin}
    onChange={() => setIsAdmin(!isAdmin)}
  />
  Signup as Admin 👑
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
  type="text"
  placeholder="Enter OTP"
  value={otp}
  onChange={(e) => setOtp(e.target.value)}
  className="w-full p-3 border rounded-lg mb-3"
/>

             <button
  type="button"
  onClick={verifyOtp}
  className="w-full bg-green-600 text-white py-3 rounded-xl"
>
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
