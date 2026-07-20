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
    <section className="mt-5 w-full">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-500">
        <Flame size={18} fill="currentColor" />
        <span>Latest Employment News</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {news.slice(0, 3).map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className={`group flex min-h-20 items-start justify-between gap-2 rounded-xl border p-3 text-sm font-semibold leading-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${
              darkMode
                ? "border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                : "border-blue-100 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
            title={item.title}
          >
            <span className="line-clamp-3">{item.title}</span>
            <ExternalLink size={15} className="mt-0.5 shrink-0 opacity-60 transition group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </section>
  );
}
