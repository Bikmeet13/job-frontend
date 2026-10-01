import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CalendarCheck2, Check, X } from "lucide-react";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const date = (value) => String(value || "").slice(0, 10);

export default function EmployerLeaveApprovals() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/employer/hr/leave-requests`, auth());
      setRequests(data || []);
    } catch { navigate("/employer/login"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    try {
      await axios.patch(`${API}/employer/hr/leave-requests/${id}`, { status }, auth());
      toast.success(`Leave request ${status.toLowerCase()}`);
      load();
    } catch (error) { toast.error(error.response?.data?.error || "Could not update leave request"); }
  };

  const pending = requests.filter((item) => item.status === "Pending");
  return <main className="min-h-screen bg-[#f5f7ff] p-4 text-slate-800 md:p-8"><div className="mx-auto max-w-5xl"><button onClick={() => navigate("/employer/hr")} className="text-sm font-bold text-violet-700 hover:underline">← Back to People Hub</button><section className="mt-4 rounded-[2rem] bg-gradient-to-br from-violet-700 to-slate-950 p-7 text-white shadow-xl"><p className="flex items-center gap-2 text-xs font-black tracking-[.2em] text-cyan-200"><CalendarCheck2 size={15}/> PEOPLE OPERATIONS</p><h1 className="mt-3 text-3xl font-black">Leave approvals</h1><p className="mt-2 text-sm text-indigo-100">Approve or decline requests. Employees see the updated decision in their People portal.</p></section><section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm"><div className="flex items-center justify-between border-b p-6"><div><h2 className="text-xl font-black">Requests awaiting action</h2><p className="mt-1 text-sm text-slate-500">{pending.length} pending request{pending.length === 1 ? "" : "s"}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">{pending.length} pending</span></div><div className="divide-y">{loading && <p className="p-8 text-center text-slate-400">Loading requests…</p>}{pending.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 font-black text-violet-700">{item.full_name.slice(0, 2).toUpperCase()}</span><div className="min-w-[180px] flex-1"><b>{item.full_name}</b><p className="mt-1 text-sm text-slate-500">{item.leave_type} · {date(item.start_date)} to {date(item.end_date)}</p>{item.reason && <p className="mt-2 text-sm text-slate-600">“{item.reason}”</p>}</div><div className="flex gap-2"><button onClick={() => decide(item.id, "Approved")} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700"><Check size={16}/> Approve</button><button onClick={() => decide(item.id, "Rejected")} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700"><X size={16}/> Reject</button></div></article>)}{!loading && !pending.length && <p className="p-12 text-center text-slate-400">No leave requests need action.</p>}</div></section><section className="mt-6 rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">Recent decisions</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{requests.filter((item) => item.status !== "Pending").slice(0, 8).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><b>{item.full_name}</b><p className="mt-1 text-sm text-slate-500">{item.leave_type} · {date(item.start_date)} to {date(item.end_date)}</p><span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.status}</span></div>)}</div></section></div></main>;
}
