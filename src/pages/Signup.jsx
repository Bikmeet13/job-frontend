import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import React, { useState } from "react";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const navigate = useNavigate();

  // ✅ SEND OTP
  const sendOtp = async () => {
    try {
      await axios.post(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/send-otp",
        { mobile }
      );

      toast.success("OTP sent 📱");
      setOtpSent(true);

    } catch (err) {
      toast.error("Failed to send OTP ❌");
    }
  };

  // ✅ VERIFY OTP + SIGNUP
  const verifyOtp = async () => {
    try {
      await axios.post(
        "https://humorous-fulfillment-production-1f5e.up.railway.app/api/verify-otp",
        {
          username,
          email,
          password,
          mobile,
          otp
        }
      );

      toast.success("Signup successful 🎉");

      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {
      toast.error("Invalid OTP ❌");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        <h2 className="text-3xl font-bold text-center mb-6">
          Create Account 🚀
        </h2>

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
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />

        <input
          type="text"
          placeholder="Mobile Number"
          onChange={(e) => setMobile(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />

        {/* SEND OTP */}
        {!otpSent && (
          <button
            onClick={sendOtp}
            className="w-full bg-blue-600 text-white py-3 rounded-xl"
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
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 border rounded-lg mt-3"
            />

            <button
              onClick={verifyOtp}
              className="w-full bg-green-600 text-white py-3 rounded-xl mt-3"
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