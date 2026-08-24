import { useNavigate } from "react-router-dom";

export default function EmployerLanding() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate("/")} className="mb-10 font-semibold text-blue-700">← MarketLence Jobs</button>
      <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 px-7 py-14 text-white shadow-xl md:px-14">
        <p className="mb-3 font-semibold text-blue-100">FOR EMPLOYERS</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">Hire Faster with MarketLence Jobs</h1>
        <p className="mt-5 max-w-2xl text-lg text-blue-50">Post your vacancies for free and connect with job seekers across India.</p>
        <div className="mt-8 flex flex-wrap gap-4"><button onClick={() => navigate("/employer/register")} className="rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow hover:bg-blue-50">Post a Job Free</button><button onClick={() => navigate("/employer/login")} className="rounded-xl border border-white/80 px-6 py-3 font-bold hover:bg-white/10">Employer Login</button></div>
      </section>
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {["Post jobs at no cost", "Reach active job seekers", "Review views and application clicks"].map((item) => <div key={item} className="rounded-2xl bg-white p-6 shadow-sm"><div className="text-2xl">✓</div><p className="mt-3 font-bold">{item}</p></div>)}
      </section>
      <section className="mt-10 rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-black">Already hiring? Post your vacancy in minutes.</h2><button onClick={() => navigate("/employer/register")} className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">Create employer account</button></section>
    </div>
  </main>;
}
