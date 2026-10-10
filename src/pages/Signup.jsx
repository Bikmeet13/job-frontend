import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { trackSignup } from "../utils/signupTracking";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("userId", data.userId);
  localStorage.setItem("username", data.username || "");
  localStorage.setItem("email", data.email || "");
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/";
  const isJobAlertsSignup = location.state?.source === "job-alerts";
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState("");

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const validationError = () => {
    if (!form.username.trim()) return "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (form.password.length < 8) return "Use at least 8 characters for your password.";
    return "";
  };

  const googleSignIn = async (credentialResponse) => {
    setBusy("google");
    try {
      const { data } = await axios.post(`${API}/google-login`, { credential: credentialResponse.credential });
      saveSession(data);
      trackSignup(data, { accountType: "candidate", method: "google" });
      toast.success(data.isNewUser ? "Your account is ready" : "Welcome back");
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || "Google sign-in failed. Please try again.");
    } finally { setBusy(""); }
  };

  const sendOtp = async () => {
    const problem = validationError();
    if (problem) return toast.error(problem);
    setBusy("send");
    try {
      const { data } = await axios.post(`${API}/send-email-otp`, { email: form.email.trim() });
      setOtpSent(true);
      toast.success(data.message || "Verification code sent");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not send the code. Please try again.");
    } finally { setBusy(""); }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) return toast.error("Enter the six-digit code from your email.");
    setBusy("verify");
    try {
      const { data } = await axios.post(`${API}/verify-email-otp`, {
        username: form.username.trim(), email: form.email.trim(), password: form.password,
        otp: otp.trim(), jobAlertsEnabled,
      });
      saveSession(data);
      trackSignup(data, { accountType: "candidate", method: "email" });
      toast.success("Your account is ready");
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || "That code could not be verified.");
    } finally { setBusy(""); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl sm:p-8">
      <h1 className="text-center text-3xl font-bold">Create your free account</h1>
      <p className="mt-2 text-center text-sm text-slate-500">Start applying in under a minute.</p>
      {isJobAlertsSignup && <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-medium leading-6 text-blue-800">Create your account to save jobs, build your resume, and get relevant job alerts.</p>}
      <div className="mt-6 flex justify-center"><GoogleLogin onSuccess={googleSignIn} onError={() => toast.error("Google sign-in was cancelled or unavailable.")} text="signup_with" shape="rectangular" width="300" /></div>
      {busy === "google" && <p className="mt-2 text-center text-sm text-slate-500">Signing you in…</p>}
      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-gray-400"><span className="h-px flex-1 bg-gray-200" />or use email<span className="h-px flex-1 bg-gray-200" /></div>
      <form onSubmit={verifyOtp} noValidate>
        <input required autoComplete="name" name="username" value={form.username} disabled={otpSent} onChange={update} placeholder="Full name" className="mb-3 w-full rounded-lg border p-3 disabled:bg-slate-50" />
        <input required autoComplete="email" type="email" name="email" value={form.email} disabled={otpSent} onChange={update} placeholder="Email address" className="mb-3 w-full rounded-lg border p-3 disabled:bg-slate-50" />
        <input required autoComplete="new-password" minLength="8" type="password" name="password" value={form.password} disabled={otpSent} onChange={update} placeholder="Password (8+ characters)" className="mb-3 w-full rounded-lg border p-3 disabled:bg-slate-50" />
        <label className="mb-4 flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked={jobAlertsEnabled} onChange={() => setJobAlertsEnabled((value) => !value)} className="mt-1" /><span>Send me relevant job alerts. I can unsubscribe anytime.</span></label>
        {!otpSent ? <button type="button" onClick={sendOtp} disabled={Boolean(busy)} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400">{busy === "send" ? "Sending code…" : "Continue with email"}</button> : <>
          <p className="mb-3 text-sm text-slate-600">We sent a six-digit code to <b>{form.email}</b>.</p>
          <input autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className="mb-3 w-full rounded-lg border p-3 text-center text-lg tracking-[0.35em]" />
          <button type="submit" disabled={Boolean(busy) || otp.length !== 6} className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400">{busy === "verify" ? "Creating account…" : "Verify and create account"}</button>
          <div className="mt-3 flex justify-between text-sm"><button type="button" disabled={Boolean(busy)} onClick={sendOtp} className="font-semibold text-blue-700 disabled:opacity-50">Resend code</button><button type="button" disabled={Boolean(busy)} onClick={() => { setOtpSent(false); setOtp(""); }} className="text-slate-600 disabled:opacity-50">Change email</button></div>
        </>}
      </form>
      <p className="mt-5 text-center text-sm">Already have an account? <button onClick={() => navigate("/login", { state: { from: destination } })} className="font-semibold text-blue-600">Sign in</button></p>
      <div className="mt-5 border-t border-gray-100 pt-4 text-center text-sm text-gray-600">Hiring? <button type="button" onClick={() => navigate("/employer/register")} className="font-semibold text-violet-700 hover:underline">Create an employer account</button></div>
    </section>
  </main>;
}
