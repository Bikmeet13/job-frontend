import { useEffect, useState } from "react";
import { Flame, ExternalLink } from "lucide-react";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app/api";

export default function EmploymentNews({ darkMode }) {
  const [news, setNews] = useState([]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/employment-news`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        if (active) setNews(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setNews([]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!news.length) return null;

  return (
    <section className={`mx-auto mb-7 flex max-w-7xl items-center gap-3 overflow-x-auto rounded-2xl border px-4 py-3 shadow-sm ${
      darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-blue-100 bg-white text-slate-800"
    }`}>
      <div className="flex shrink-0 items-center gap-2 font-bold text-orange-500">
        <Flame size={18} fill="currentColor" />
        <span>Employment News</span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {news.slice(0, 3).map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className={`flex max-w-xs shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-700 ${
              darkMode ? "hover:bg-gray-700" : "bg-slate-50"
            }`}
            title={item.title}
          >
            <span className="truncate">{item.title}</span>
            <ExternalLink size={14} className="shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
