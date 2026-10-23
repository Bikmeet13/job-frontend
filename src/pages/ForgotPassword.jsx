import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = /^\S+@\S+\.\S+$/.test(normalizedEmail);
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { label: "Choose a new password", width: "0%", color: "bg-slate-200" };
    const score = [newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length;
    if (score <= 1) return { label: "Weak — use 8+ characters", width: "25%", color: "bg-rose-500" };
    if (score === 2) return { label: "Fair — add a number or symbol", width: "55%", color: "bg-amber-500" };
    if (score === 3) return { label: "Good password", width: "78%", color: "bg-sky-500" };
    return { label: "Strong password", width: "100%", color: "bg-emerald-500" };
  }, [newPassword]);

  useEffect(() => {
    if (!resendSeconds) return undefined;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const sendOtp = async () => {
    if (!emailIsValid) return toast.error("Enter a valid email address first.");
    setSending(true);
    try {
      await axios.post(`${API_URL}/send-email-otp`, { email: normalizedEmail });
      setOtpSent(true);
      setResendSeconds(45);
      toast.success("Your verification code has been sent.");
    } catch (error) {
      toast.error(error.response?.data?.error || "We could not send the verification code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (otp.trim().length < 4) return toast.error("Enter the verification code from your email.");
    if (newPassword.length < 8) return toast.error("Your new password must be at least 8 characters.");
    setResetting(true);
    try {
      await axios.post(`${API_URL}/reset-password`, { email: normalizedEmail, otp: otp.trim(), newPassword });
      toast.success("Password updated. You can now sign in.");
      window.setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      toast.error(error.response?.data?.error || "We could not reset your password. Check your code and try again.");
    } finally {
      setResetting(false);
    }
  };

  const changeEmail = () => {
    setOtpSent(false);
    setOtp("");
    setNewPassword("");
    setResendSeconds(0);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,.48),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,.3),transparent_34%),linear-gradient(145deg,#0f172a,#111827_55%,#1e1b4b)]" />
      <div className="absolute -left-20 top-16 h-64 w-64 rounded-full border border-white/15 bg-white/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-12 h-80 w-80 rounded-full border border-violet-300/20 bg-violet-500/20 blur-3xl" />

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/95 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl lg:grid lg:grid-cols-[.92fr_1.08fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-900 p-7 text-white sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/20 bg-white/10" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full border border-cyan-200/20 bg-cyan-400/10" />
          <button type="button" onClick={() => navigate("/")} className="relative inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20">← Back to Marketlence Jobs</button>
          <div className="relative mt-12">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/30 bg-white/15 text-2xl shadow-lg">🔐</div>
            <p className="mt-8 text-xs font-black tracking-[.2em] text-indigo-100">ACCOUNT RECOVERY</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Get back to your career journey.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100">Verify your email, choose a fresh password, and return to your saved jobs, applications, and opportunities.</p>
          </div>
          <div className="relative mt-10 space-y-3">
            {["One-time code sent to your email", "Your password is never visible to Marketlence", "Back to job searching in a few moments"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/15 p-3 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-indigo-700">{index + 1}</span>{item}</div>)}
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-black tracking-[.18em] text-indigo-600">SECURE RESET</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Forgot your password?</h2><p className="mt-2 text-sm leading-6 text-slate-500">{otpSent ? "Enter the code we sent and create your new password." : "Enter the email linked to your Marketlence account."}</p></div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-xl">✦</div>
          </div>

          <div className="mt-8 flex gap-2" aria-label="Password reset progress"><span className="h-1.5 flex-1 rounded-full bg-indigo-600" /><span className={`h-1.5 flex-1 rounded-full ${otpSent ? "bg-indigo-600" : "bg-slate-200"}`} /><span className="h-1.5 flex-1 rounded-full bg-slate-200" /></div>

          {!otpSent ? (
            <div className="mt-8 space-y-5">
              <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Email address</span><div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 transition ${email && !emailIsValid ? "border-rose-300 ring-4 ring-rose-50" : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50"}`}><span>✉️</span><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendOtp()} placeholder="you@example.com" className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" /></div>{email && !emailIsValid && <span className="mt-2 block text-xs font-semibold text-rose-600">Please use a valid email address.</span>}</label>
              <button type="button" onClick={sendOtp} disabled={sending || !emailIsValid} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending secure code…" : "Send verification code →"}</button>
            </div>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={resetPassword}>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"><div><p className="text-sm font-black text-emerald-900">Code sent to {normalizedEmail}</p><p className="mt-0.5 text-xs text-emerald-700">Check inbox and spam folders.</p></div><button type="button" onClick={changeEmail} className="text-xs font-black text-indigo-700 hover:underline">Change email</button></div>
              <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Verification code</span><input autoFocus value={otp} inputMode="numeric" autoComplete="one-time-code" maxLength={8} onChange={(event) => setOtp(event.target.value.replace(/\s/g, ""))} placeholder="Enter code from email" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center text-lg font-black tracking-[.35em] outline-none transition placeholder:text-left placeholder:text-sm placeholder:font-medium placeholder:tracking-normal focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></label>
              <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">New password</span><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50"><input type={showPassword ? "text" : "password"} value={newPassword} autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 text-xs font-black text-indigo-700">{showPassword ? "Hide" : "Show"}</button></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${passwordStrength.color}`} style={{ width: passwordStrength.width }} /></div><p className="mt-1.5 text-xs font-medium text-slate-500">{passwordStrength.label}</p></label>
              <button type="submit" disabled={resetting || otp.trim().length < 4 || newPassword.length < 8} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">{resetting ? "Updating password…" : "Update password securely →"}</button>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500"><span>Didn’t receive it?</span><button type="button" disabled={resendSeconds > 0 || sending} onClick={sendOtp} className="font-black text-indigo-700 disabled:text-slate-400">{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}</button></div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">Remembered it? <button type="button" onClick={() => navigate("/login")} className="font-black text-indigo-700 hover:underline">Sign in instead</button></p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
