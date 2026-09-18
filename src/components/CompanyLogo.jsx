import { useMemo, useState } from "react";

const officialDomains = {
  google: "google.com", alphabet: "abc.xyz", amazon: "amazon.com", microsoft: "microsoft.com", apple: "apple.com", meta: "meta.com", facebook: "meta.com", netflix: "netflix.com", ibm: "ibm.com", oracle: "oracle.com", accenture: "accenture.com", infosys: "infosys.com", tcs: "tcs.com", "tata consultancy services": "tcs.com", wipro: "wipro.com", "hdfc bank": "hdfcbank.com", "icici bank": "icicibank.com", "idfc first bank": "idfcfirstbank.com", "reliance industries": "ril.com", "isro careers": "isro.gov.in", isro: "isro.gov.in", "indian railways": "indianrailways.gov.in", "staff selection commission": "ssc.gov.in", "union public service commission": "upsc.gov.in", "india post": "indiapost.gov.in", "tata consultancy": "tcs.com", siemens: "siemens.com", samsung: "samsung.com", toyota: "toyota.com", "l'oreal": "loreal.com", ikea: "ikea.com", "standard bank": "standardbank.com", safaricom: "safaricom.co.ke", "saudi aramco": "aramco.com", qantas: "qantas.com", shopify: "shopify.com", tesco: "tesco.com", nokia: "nokia.com", airasia: "airasia.com", emirates: "emirates.com", "emirates group": "emirates.com", "canada job bank": "jobbank.gc.ca", "make it in germany": "make-it-in-germany.com", "uk find a job": "findajob.dwp.gov.uk", "workforce australia": "workforceaustralia.gov.au", jobsireland: "jobsireland.ie", "france travail": "francetravail.fr"
};

function domainFrom(value) {
  try { const url = new URL(value); return url.hostname.replace(/^www\./, ""); } catch { return ""; }
}
function matchingDomain(company) {
  const normalized = String(company || "").toLowerCase().trim();
  if (officialDomains[normalized]) return officialDomains[normalized];
  return Object.entries(officialDomains).find(([name]) => normalized.includes(name) || name.includes(normalized))?.[1] || "";
}
export function getCompanyDomain(job = {}) { return domainFrom(job.company_website || job.website || job.applyLink || job.apply_link || job.url) || matchingDomain(job.company); }

export default function CompanyLogo({ job, className = "" }) {
  const [failed, setFailed] = useState(false);
  const name = String(job?.company || "Organization");
  const domain = useMemo(() => getCompanyDomain(job), [job]);
  const supplied = job?.company_logo || job?.companyLogo || job?.logo_url;
  const source = supplied || (domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : "");
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <span className={`company-logo ${className}`} title={name}>{source && !failed ? <img src={source} alt={`${name} logo`} onError={() => setFailed(true)} /> : <b>{initials || "CO"}</b>}</span>;
}
