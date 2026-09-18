import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bot, ChevronDown, Send, Sparkles, X } from "lucide-react";

const API = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";
const starters = ["How do I find jobs?", "Help me choose a career path", "How do I build my resume?", "What can employers do here?"];

export default function GlexaAssistant() {
  const [open, setOpen] = useState(false); const [input, setInput] = useState(""); const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi, I’m Glexa ✦ Your MarketLence career buddy. Ask me about jobs, site features, education choices, or building your career path." }]);
  const scrollRef = useRef(null);
  useEffect(() => { if (open) setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 40); }, [open, messages, sending]);
  const ask = async (value = input) => {
    const question = String(value || "").trim(); if (!question || sending) return;
    const next = [...messages, { role: "user", content: question }]; setMessages(next); setInput(""); setSending(true);
    try { const { data } = await axios.post(`${API}/glexa`, { message: question, history: messages.slice(-6) }); setMessages((current) => [...current, { role: "assistant", content: data.reply }]); }
    catch (error) { setMessages((current) => [...current, { role: "assistant", content: error.response?.data?.error || "I’m having a little trouble connecting. Please try again." }]); }
    finally { setSending(false); }
  };
  return <div className="glexa-root">
    {open && <section className="glexa-panel" aria-label="Glexa assistant"><header className="glexa-header"><div className="flex items-center gap-3"><span className="glexa-mini-orb"><i/></span><div><p>GLEXA</p><b>Career & site buddy</b><small><span/> Online to help</small></div></div><button onClick={() => setOpen(false)} aria-label="Close Glexa"><X size={19}/></button></header><div className="glexa-messages" ref={scrollRef}>{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`glexa-message ${message.role}`}><span>{message.role === "assistant" ? <Bot size={15}/> : "You"}</span><p>{message.content}</p></div>)}{sending && <div className="glexa-typing"><i/><i/><i/></div>}</div><div className="glexa-starters">{starters.map((starter) => <button key={starter} onClick={() => ask(starter)}>{starter}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); ask(); }} className="glexa-compose"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Glexa anything…" maxLength="1500"/><button disabled={!input.trim() || sending} aria-label="Send message"><Send size={17}/></button></form><footer><Sparkles size={12}/> Glexa gives general guidance, not professional advice.</footer></section>}
    <button onClick={() => setOpen((current) => !current)} className={`glexa-orb-button ${open ? "is-open" : ""}`} aria-label={open ? "Close Glexa" : "Open Glexa assistant"}><span className="glexa-orb"><i/><b/><em/></span><span className="glexa-label">{open ? "Close" : "Ask Glexa"}</span><ChevronDown size={15}/></button>
  </div>;
}
