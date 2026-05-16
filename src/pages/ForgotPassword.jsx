import React, { useState } from "react";
import axios from "axios";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = async () => {
    await axios.post(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/send-email-otp",
      { email }
    );

    setOtpSent(true);
    alert("OTP sent 📩");
  };

  const resetPassword = async () => {
    try {
      await await axios.post(
  "https://humorous-fulfillment-production-1f5e.up.railway.app/api/reset-password",
        {
          email,
          otp,
          newPassword
        }
      );

      alert("Password reset successful ✅");

    } catch (err) {
      alert(err.response?.data?.error);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>

      <input
        placeholder="Enter Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      {!otpSent && (
        <button onClick={sendOtp}>Send OTP</button>
      )}

      {otpSent && (
        <>
          <input
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
          />

          <input
            type="password"
            placeholder="New Password"
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button onClick={resetPassword}>
            Reset Password
          </button>
        </>
      )}
    </div>
  );
}

export default ForgotPassword;