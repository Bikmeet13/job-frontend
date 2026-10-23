import { useState } from "react";
import axios from "axios";
import { CheckCircle2, LockKeyhole, ShieldCheck, X } from "lucide-react";
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

export default function PremiumResourceAccess({ onUnlocked, onClose }) {
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("visa_six_month");
  const plans = [
    { id: "visa_six_month", amount: "₹599", duration: "6 months", caption: "Best value · about ₹100/month" },
    { id: "visa_monthly", amount: "₹125", duration: "30 days", caption: "Flexible monthly access" },
  ];
  const activePlan = plans.find((plan) => plan.id === selectedPlan) || plans[0];

  const purchase = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/premium-resources/order`, { planId: selectedPlan }, auth());
      if (data.hasAccess) {
        onUnlocked?.();
        return;
      }
      if (!(await loadRazorpay())) throw new Error("Could not load secure payment checkout.");
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "MarketLence Jobs",
        description: data.name,
        order_id: data.orderId,
        prefill: {
          name: localStorage.getItem("username") || "",
          email: localStorage.getItem("email") || "",
        },
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            await axios.post(`${API}/premium-resources/verify`, response, auth());
            toast.success("Payment confirmed — premium resources unlocked!");
            onUnlocked?.();
          } catch (error) {
            toast.error(error.response?.data?.error || "Payment received, but access needs review. Please contact support.");
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Could not start payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="premium-resource-title">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-2xl bg-white/15 p-3"><LockKeyhole size={25} /></div>
            <button type="button" onClick={onClose} aria-label="Close payment" className="rounded-full p-1 text-white/80 transition hover:bg-white/15 hover:text-white"><X size={23} /></button>
          </div>
          <p className="mt-5 text-xs font-black tracking-[0.18em] text-indigo-100">PREMIUM ACCESS</p>
          <h2 id="premium-resource-title" className="mt-2 text-3xl font-black leading-tight">Visa & sponsored jobs</h2>
          <p className="mt-3 text-sm leading-6 text-indigo-100">Unlock the sponsored-jobs view and official international work-visa resources.</p>
        </div>
        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)} className={`rounded-2xl border p-4 text-left transition ${selectedPlan === plan.id ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200 bg-white hover:border-indigo-300"}`}><span className="block text-2xl font-black text-indigo-950">{plan.amount}</span><span className="mt-1 block font-bold text-slate-900">{plan.duration}</span><span className="mt-1 block text-xs text-slate-600">{plan.caption}</span></button>)}
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-700">
            <li className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-600" size={19} />Sponsored and visa-support job listings</li>
            <li className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-600" size={19} />Official work-visa and international-job links</li>
            <li className="flex gap-3"><ShieldCheck className="shrink-0 text-indigo-600" size={19} />Secure payment processed by Razorpay</li>
          </ul>
          <button type="button" disabled={busy} onClick={purchase} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-wait disabled:opacity-70">
            {busy ? "Opening secure checkout…" : `Pay ${activePlan.amount} & unlock access`}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">Access is linked to this MarketLence account and ends after the selected duration.</p>
        </div>
      </div>
    </div>
  );
}
