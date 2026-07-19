import { useEffect, useState } from "react";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const DISMISSED_KEY = "jobNotificationPromptDismissed";

function urlBase64ToUint8Array(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function JobNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const canUsePush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const dismissed = localStorage.getItem(DISMISSED_KEY);

    if (canUsePush && !dismissed && Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const subscribe = async () => {
    setSubscribing(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications were not allowed. You can enable them later in your browser settings.");
        return;
      }

      const keyResponse = await fetch(`${API_URL}/push/public-key`);
      if (!keyResponse.ok) throw new Error("Notifications are not ready yet.");
      const { publicKey } = await keyResponse.json();

      const registration = await navigator.serviceWorker.register("/job-alerts-sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch(`${API_URL}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      if (!response.ok) throw new Error("Could not save your subscription.");

      localStorage.setItem(DISMISSED_KEY, "true");
      setMessage("You are subscribed. We will let you know when a new job is posted.");
      setTimeout(() => setVisible(false), 2500);
    } catch (error) {
      setMessage(error.message || "Could not enable notifications. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-900/20">
      <button onClick={dismiss} className="absolute right-4 top-3 text-lg text-gray-400 hover:text-gray-700" aria-label="Dismiss notification prompt">
        &times;
      </button>
      <p className="pr-7 text-lg font-bold text-slate-900">Get new job alerts</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Be the first to know when Marketlence posts a new internal job.</p>
      {message && <p className="mt-3 text-sm font-medium text-blue-700">{message}</p>}
      <div className="mt-4 flex gap-3">
        <button onClick={subscribe} disabled={subscribing} className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60">
          {subscribing ? "Subscribing..." : "Enable notifications"}
        </button>
        <button onClick={dismiss} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Not now</button>
      </div>
    </div>
  );
}
