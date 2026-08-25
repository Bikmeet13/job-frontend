import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function FeaturedJobPurchase({ job, onDone, onClose }) {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { axios.get(`${API}/employer/featured-plans`, auth()).then((res) => setPlans(res.data)).catch(() => toast.error("Could not load featured plans")); }, []);
  const purchase = async (planId) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/employer/jobs/${job.id}/featured-order`, { planId }, auth());
      if (!(await loadRazorpay())) throw new Error("Could not load secure payment checkout.");
      const checkout = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency, name: "MarketLence Jobs", description: `${data.plan.name}: ${job.title}`, order_id: data.orderId,
        prefill: { name: localStorage.getItem("username") || "", email: localStorage.getItem("email") || "" },
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try { await axios.post(`${API}/employer/featured-payment/verify`, response, auth()); toast.success(`Featured for ${data.plan.days} days!`); onDone?.(); onClose?.(); }
          catch (error) { toast.error(error.response?.data?.error || "Payment received but activation needs review. Please contact support."); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (error) { toast.error(error.response?.data?.error || error.message || "Could not start payment"); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-blue-700">PROMOTE THIS JOB</p><h2 className="mt-1 text-2xl font-black">Get more visibility</h2><p className="mt-2 text-sm text-slate-600">Feature <b>{job.title}</b> at the top of MarketLence Jobs.</p></div><button onClick={onClose} className="text-xl text-slate-500">×</button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{plans.map((plan) => <button disabled={busy} onClick={() => purchase(plan.id)} key={plan.id} className="rounded-2xl border-2 border-blue-100 p-5 text-left transition hover:border-blue-600 hover:bg-blue-50 disabled:opacity-60"><p className="font-black text-slate-900">₹{plan.amount}</p><p className="mt-1 font-bold text-blue-700">{plan.days} days featured</p><p className="mt-2 text-xs text-slate-500">Featured placement and stronger visibility.</p></button>)}</div><p className="mt-5 text-center text-xs text-slate-500">Secure payment via Razorpay. Your job becomes featured only after payment verification.</p></div></div>;
}
