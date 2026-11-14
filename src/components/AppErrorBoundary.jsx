import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) { console.error("App render failed", error); }

  render() {
    if (!this.state.failed) return this.props.children;
    const signup = window.location.pathname === "/signup";
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-5 text-slate-900"><section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-xl"><img src="/marketlence-mj-logo.png" alt="MarketLence Jobs" className="mx-auto h-14 w-14 rounded-2xl object-contain"/><h1 className="mt-5 text-2xl font-black">Let’s get this page open</h1><p className="mt-3 text-sm leading-6 text-slate-600">Your in-app browser could not finish loading this page. Reload it once, or open the link in Chrome or Safari.</p><button onClick={() => window.location.reload()} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white">Reload page</button>{!signup && <a href="/signup" className="mt-3 block rounded-xl border border-blue-200 px-4 py-3 font-black text-blue-700">Open signup</a>}</section></main>;
  }
}
