import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Copy, Gift, LockKeyhole, ShieldCheck, X } from "lucide-react";
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

const activeReferralCode = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("visaReferral") || "null");
    return stored?.code && Date.now() - Number(stored.capturedAt || 0) < 30 * 24 * 60 * 60 * 1000 ? stored.code : "";
  } catch {
    return "";
  }
};

export default function PremiumResourceAccess({ onUnlocked, onClose, startWithReferral = false }) {
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("visa_six_month");
  const [referralOpen, setReferralOpen] = useState(startWithReferral);
  const [referralBusy, setReferralBusy] = useState(startWithReferral);
  const [referral, setReferral] = useState(null);
  const [upiId, setUpiId] = useState("");
  const plans = [
    { id: "visa_six_month", amount: "₹599", duration: "6 months", caption: "Best value · about ₹100/month" },
    { id: "visa_monthly", amount: "₹125", duration: "30 days", caption: "Flexible monthly access" },
  ];
  const activePlan = plans.find((plan) => plan.id === selectedPlan) || plans[0];

  const openReferral = async () => {
    setReferralOpen(true);
    setReferralBusy(true);
    try {
      const { data } = await axios.get(API + "/visa-referrals/me", auth());
      setReferral(data);
      if (data.upiId) setUpiId(data.upiId);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not load referral details.");
    } finally {
      setReferralBusy(false);
    }
  };

  useEffect(() => {
    if (!startWithReferral) return undefined;
    let active = true;
    axios.get(API + "/visa-referrals/me", auth())
      .then(({ data }) => {
        if (!active) return;
        setReferral(data);
        if (data.upiId) setUpiId(data.upiId);
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.error || "Could not load referral details.");
      })
      .finally(() => {
        if (active) setReferralBusy(false);
      });
    return () => { active = false; };
  }, [startWithReferral]);

  const registerReferral = async () => {
    setReferralBusy(true);
    try {
      const { data } = await axios.post(API + "/visa-referrals/register", { upiId }, auth());
      const current = referral || {};
      setReferral({ ...current, ...data, successfulReferrals: current.successfulReferrals || 0, totalReward: current.totalReward || 0, pendingReward: current.pendingReward || 0 });
      setUpiId(data.upiId);
      toast.success("Referral account ready.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not create your referral account.");
    } finally {
      setReferralBusy(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Copy failed. Select the link and copy it manually.");
    }
  };

  const purchase = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/premium-resources/order`, { planId: selectedPlan, referralCode: activeReferralCode() }, auth());
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
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-indigo-100 bg-white shadow-2xl">
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
          <button type="button" onClick={() => referralOpen ? setReferralOpen(false) : openReferral()} className="mt-5 flex w-full items-center justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-400">
            <span className="flex items-center gap-3"><span className="rounded-xl bg-emerald-600 p-2 text-white"><Gift size={19} /></span><span><b className="block text-emerald-950">Earn per referral</b><small className="text-emerald-800">₹151 for 6 months · ₹45 monthly</small></span></span>
            <span className="font-black text-emerald-700">{referralOpen ? "−" : "+"}</span>
          </button>
          {referralOpen && <section className="mt-3 rounded-2xl border border-emerald-200 bg-white p-4">
            {referralBusy && !referral ? <p className="text-sm font-semibold text-slate-500">Loading referral details…</p> : <>
              <p className="text-sm leading-6 text-slate-600">Register your UPI ID, share your unique link, and earn after a referred user completes a verified Visa Jobs subscription.</p>
              <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-600">Your UPI ID
                <input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@bank" autoCapitalize="none" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
              <button type="button" disabled={referralBusy || !upiId.trim()} onClick={registerReferral} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">{referral?.registered ? "Update UPI ID" : "Create my referral code"}</button>
              {referral?.registered && <div className="mt-4 border-t border-emerald-100 pt-4">
                <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-2"><b className="block text-slate-900">{referral.successfulReferrals || 0}</b><small className="text-slate-500">Successful</small></div><div className="rounded-xl bg-slate-50 p-2"><b className="block text-slate-900">₹{referral.totalReward || 0}</b><small className="text-slate-500">Earned</small></div><div className="rounded-xl bg-amber-50 p-2"><b className="block text-amber-900">₹{referral.pendingReward || 0}</b><small className="text-amber-700">Pending</small></div></div>
                <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">Referral code: {referral.code}</p>
                <div className="mt-2 flex gap-2"><input readOnly value={referral.referralLink || ""} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" /><button type="button" onClick={copyReferralLink} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"><Copy size={15} /> Copy</button></div>
              </div>}
              <p className="mt-3 text-[11px] leading-4 text-slate-500">Rewards become pending only after verified payment. Self-referrals do not qualify. Payouts are credited manually to your registered UPI ID.</p>
            </>}
          </section>}
          <button type="button" disabled={busy} onClick={purchase} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-wait disabled:opacity-70">
            {busy ? "Opening secure checkout…" : `Pay ${activePlan.amount} & unlock access`}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">Access is linked to this MarketLence account and ends after the selected duration.</p>
        </div>
      </div>
    </div>
  );
}
