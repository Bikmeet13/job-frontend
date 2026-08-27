import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const field = "w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500";

export default function EmployerAuth({ login = false }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", companyName: "", website: "https://", companyType: "Private company", industry: "", companySize: "1-10", city: "", state: "", password: "" });
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "email") { setOtp(""); setVerificationToken(""); }
  };
  const finishSignIn = (data, message) => {
    localStorage.setItem("token", data.token); localStorage.setItem("role", "employer"); localStorage.setItem("userId", data.userId); localStorage.setItem("username", data.username || "");
    if (data.email) localStorage.setItem("email", data.email);
    toast.success(message); navigate("/employer/dashboard");
  };
  const sendVerificationCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error("Enter your work email first.");
    setSendingCode(true);
    try { const { data } = await axios.post(`${API}/employers/send-email-otp`, { email: form.email }); toast.success(data.message); }
    catch (error) { toast.error(error.response?.data?.error || "Could not send the verification code."); }
    finally { setSendingCode(false); }
  };
  const verifyEmail = async () => {
    if (!/^\d{6}$/.test(otp.trim())) return toast.error("Enter the six-digit code from your email.");
    setVerifyingCode(true);
    try { const { data } = await axios.post(`${API}/employers/verify-email-otp`, { email: form.email, code: otp }); setVerificationToken(data.verificationToken); toast.success("Work email verified."); }
    catch (error) { toast.error(error.response?.data?.error || "Could not verify that code."); }
    finally { setVerifyingCode(false); }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!login && !verificationToken) return toast.error("Verify your work email before creating the account.");
    setSubmitting(true);
    try {
      const body = login ? { email: form.email, password: form.password } : { ...form, emailVerificationToken: verificationToken };
      const { data } = await axios.post(`${API}/employers/${login ? "login" : "register"}`, body);
      finishSignIn(data, login ? "Welcome back" : "Employer account created");
    } catch (error) { toast.error(error.response?.data?.error || "Please try again."); }
    finally { setSubmitting(false); }
  };
  const googleSignIn = async (credentialResponse) => {
    try {
      if (!login && (!form.fullName || !form.companyName || !form.mobile || !form.city || !form.state)) return toast.error("Complete your company details before continuing with Google.");
      const { data } = await axios.post(`${API}/google-login`, { credential: credentialResponse.credential, accountType: "employer", employerProfile: form });
      finishSignIn(data, "Employer account ready");
    } catch (error) { toast.error(error.response?.data?.error || "Google sign-in failed. Please try again."); }
  };

  return <main className="min-h-screen bg-slate-100 p-5"><form onSubmit={submit} className="mx-auto max-w-3xl rounded-3xl bg-white p-7 shadow-xl md:p-10">
    <Link to="/employers" className="font-semibold text-blue-700">← For employers</Link>
    <h1 className="mt-5 text-3xl font-black">{login ? "Employer Login" : "Create your employer account"}</h1>
    <p className="mt-2 text-slate-600">{login ? "Access your jobs and hiring activity." : "Verify your work email first. Your vacancies will be checked before they go live."}</p>
    <div className="mt-7 grid gap-4 md:grid-cols-2">{!login && <><input required name="fullName" value={form.fullName} onChange={update} placeholder="Full name *" className={field}/><input required name="mobile" value={form.mobile} onChange={update} placeholder="Mobile number *" className={field}/><input required name="companyName" value={form.companyName} onChange={update} placeholder="Company name *" className={field}/><input name="website" value={form.website} onChange={update} placeholder="Company website" className={field}/><select name="companyType" value={form.companyType} onChange={update} className={field}><option>Private company</option><option>Startup</option><option>Recruitment agency</option><option>Non-profit</option></select><input name="industry" value={form.industry} onChange={update} placeholder="Industry" className={field}/><select name="companySize" value={form.companySize} onChange={update} className={field}><option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500+</option></select><input required name="city" value={form.city} onChange={update} placeholder="City *" className={field}/><input required name="state" value={form.state} onChange={update} placeholder="State *" className={field}/></>}<input required type="email" name="email" value={form.email} onChange={update} placeholder="Work email *" className={field}/><input required minLength="8" type="password" name="password" value={form.password} onChange={update} placeholder="Password (8+ characters) *" className={field}/></div>
    {!login && <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">Verify your work email</p><p className="text-sm text-slate-600">We will send a six-digit code. It expires after 10 minutes.</p></div><button type="button" onClick={sendVerificationCode} disabled={sendingCode || Boolean(verificationToken)} className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{verificationToken ? "Email verified ✓" : sendingCode ? "Sending..." : "Send code"}</button></div>{!verificationToken && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input inputMode="numeric" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="Enter 6-digit code" className={field}/><button type="button" onClick={verifyEmail} disabled={verifyingCode} className="rounded-xl border border-blue-600 px-4 py-2.5 font-bold text-blue-700 disabled:opacity-60">{verifyingCode ? "Verifying..." : "Verify email"}</button></div>}</section>}
    <button disabled={submitting} className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Please wait..." : login ? "Login" : "Create account & post a job"}</button>
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200"/>or continue with<span className="h-px flex-1 bg-slate-200"/></div>
    <div className="flex justify-center"><GoogleLogin onSuccess={googleSignIn} onError={() => toast.error("Google sign-in failed. Please try again.")} text={login ? "signin_with" : "signup_with"} width="300"/></div>
    <p className="mt-5 text-center text-sm">{login ? "New employer?" : "Already have an account?"} <Link className="font-bold text-blue-700" to={login ? "/employer/register" : "/employer/login"}>{login ? "Register" : "Employer login"}</Link></p>
  </form></main>;
}
