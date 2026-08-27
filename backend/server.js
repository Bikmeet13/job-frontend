require("dotenv").config();

console.log("DB URL:", process.env.DATABASE_URL);

const lastRequest = {};
const otpStore = {};
// Employer registration codes are intentionally kept separate from candidate
// signup/reset-password codes. They are short-lived and stored only as hashes.
const employerEmailOtps = new Map();
const EMPLOYER_EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMPLOYER_EMAIL_OTP_RESEND_MS = 60 * 1000;
const EMPLOYER_EMAIL_OTP_MAX_ATTEMPTS = 5;
let employmentNewsCache = { items: [], expiresAt: 0 };
let companyJobScanRunning = false;
let visaJobScanRunning = false;
const employmentNewsFallback = [
  {
    title: "Latest hiring and job market news in India",
    link: "https://news.google.com/search?q=latest%20hiring%20job%20market%20India&hl=en-IN&gl=IN&ceid=IN:en",
  },
  {
    title: "Technology careers and IT hiring updates",
    link: "https://news.google.com/search?q=technology%20careers%20IT%20hiring%20India&hl=en-IN&gl=IN&ceid=IN:en",
  },
  {
    title: "Government and private sector employment updates",
    link: "https://news.google.com/search?q=employment%20jobs%20government%20private%20sector%20India&hl=en-IN&gl=IN&ceid=IN:en",
  },
];
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const { Document: WordDocument, Packer, Paragraph } = require("docx");

const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");

const cloudinary = require("cloudinary").v2;

const {
  CloudinaryStorage
} = require("multer-storage-cloudinary");

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const db = require("./db");
const { getFeaturedJobs } = require("./services/featuredJobs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");  

const multer = require("multer");
const path = require("path");
const express = require("express");
const cors = require("cors");

const { OAuth2Client } = require("google-auth-library");
const webpush = require("web-push");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

console.log(
  "OPENAI KEY EXISTS:",
  !!process.env.OPENAI_API_KEY
);

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

cloudinary.config({

  cloud_name: process.env.CLOUD_NAME,

  api_key: process.env.CLOUD_API_KEY,

  api_secret: process.env.CLOUD_API_SECRET

});


const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image");

    return {
      folder: "marketlence",
      resource_type: isImage ? "image" : "raw",
      type: "upload",
      access_mode: "public"
    };
  }
});

const upload = multer({ storage });
const resumeTextUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});
const documentConvertUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function createTextPdf(title, text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(String(text || "No readable text found."), { lineGap: 3 });
    doc.end();
  });
}

async function extractDocumentText(file) {
  const name = String(file.originalname || "").toLowerCase();
  if (name.endsWith(".pdf")) return (await pdfParse(file.buffer)).text;
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    return workbook.SheetNames.map((sheetName) => `--- ${sheetName} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join("\n\n");
  }
  if (name.endsWith(".txt") || file.mimetype === "text/plain") return file.buffer.toString("utf8");
  throw new Error("This output requires a PDF, Word, Excel, CSV, or text file.");
}

const app = express();
app.use(cors({
  origin: [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "https://job-frontend-vert.vercel.app",
  "https://jobs.marketlence.com"
],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());   // ✅ REQUIRED

app.post("/api/resume-builder/import", resumeTextUpload.single("document"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please choose a file first." });

    const file = req.file;
    const name = (file.originalname || "").toLowerCase();
    let text = "";

    if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) {
      text = (await pdfParse(file.buffer)).text;
    } else if (file.mimetype.includes("wordprocessingml") || name.endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } else if (file.mimetype === "text/plain" || name.endsWith(".txt")) {
      text = file.buffer.toString("utf8");
    } else if (file.mimetype.startsWith("image/")) {
      if (!process.env.OPENAI_API_KEY) return res.status(503).json({ message: "Image reading is not configured yet. Please use a PDF, Word, or text document." });
      const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const vision = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: [
          { type: "text", text: "Read all resume text visible in this image. Return plain text only." },
          { type: "image_url", image_url: { url: imageUrl } },
        ] }],
      });
      text = vision.choices?.[0]?.message?.content || "";
    } else {
      return res.status(400).json({ message: "Please upload a PDF, DOCX, TXT, JPG, or PNG file." });
    }

    if (!text.trim()) return res.status(400).json({ message: "No readable text was found in this file." });

    let extracted = {};
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Extract a resume into JSON only. Use keys fullName, email, phone, location, summary, skills, experience, education. Skills must be a comma-separated string; experience and education should use one item per line. Leave unknown fields empty." },
            { role: "user", content: text.slice(0, 18000) },
          ],
        });
        extracted = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
      } catch (error) {
        // The uploaded document was read correctly. Keep that text available
        // even if the optional AI field extraction is temporarily unavailable.
        console.error("Resume AI extraction failed; returning readable text:", error.message);
      }
    }

    res.json({ text, extracted });
  } catch (error) {
    console.error("Resume builder import failed:", error.message);
    res.status(500).json({ message: "We could not read that file. Try a smaller PDF, DOCX, TXT, JPG, or PNG." });
  }
});

app.post("/api/document-generator/convert", documentConvertUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const outputFormat = String(req.body?.outputFormat || "pdf").toLowerCase();
    if (!file) return res.status(400).json({ error: "Choose a file first." });
    const inputName = String(file.originalname || "document");
    const baseName = inputName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_ ]/gi, "").slice(0, 80) || "document";
    const isImage = file.mimetype.startsWith("image/") || /\.(png|jpe?g)$/i.test(inputName);

    if (outputFormat === "pdf") {
      if (/\.pdf$/i.test(inputName)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
        return res.send(file.buffer);
      }
      if (isImage) {
        const pdf = await new Promise((resolve, reject) => {
          const doc = new PDFDocument({ margin: 35 }); const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
          doc.image(file.buffer, 35, 35, { fit: [540, 720], align: "center", valign: "center" }); doc.end();
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
        return res.send(pdf);
      }
      const pdf = await createTextPdf(baseName, await extractDocumentText(file));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.send(pdf);
    }

    const text = await extractDocumentText(file);
    if (outputFormat === "txt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.txt"`);
      return res.send(text);
    }
    if (outputFormat === "docx") {
      const word = new WordDocument({ sections: [{ children: String(text).split(/\r?\n/).map((line) => new Paragraph(line || " ")) }] });
      const buffer = await Packer.toBuffer(word);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.docx"`);
      return res.send(buffer);
    }
    if (outputFormat === "xlsx") {
      const rows = String(text).split(/\r?\n/).filter(Boolean).map((line) => [line]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows.length ? rows : [["No readable text found"]]), "Converted document");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xlsx"`);
      return res.send(buffer);
    }
    return res.status(400).json({ error: "Choose PDF, Word, Excel, or text as the output format." });
  } catch (error) {
    console.error("Document conversion failed:", error.message);
    res.status(400).json({ error: error.message || "This file could not be converted." });
  }
});

const pushNotificationsEnabled = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
);

if (pushNotificationsEnabled) {
  webpush.setVapidDetails(
    "mailto:care@marketlence.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("Web push is disabled: VAPID keys are not configured.");
}

async function ensurePushSubscriptionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureJobColumns() {
  await Promise.all([
    db.query(
      "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_enabled BOOLEAN NOT NULL DEFAULT TRUE"
    ),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_link TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_category TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_date TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
    db.query("ALTER TABLE jobs ALTER COLUMN title TYPE VARCHAR(300)"),
  ]);
}

const applicationStatuses = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Interview Completed", "Selected", "Not Selected", "Withdrawn"];

async function ensureApplicationTrackingTables() {
  await Promise.all([
    db.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS candidate_user_id INTEGER"),
    db.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
    db.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
    db.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_note TEXT"),
    db.query("ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'Applied'"),
    db.query("CREATE TABLE IF NOT EXISTS application_status_history (id SERIAL PRIMARY KEY, application_id INTEGER NOT NULL, status TEXT NOT NULL, note TEXT, changed_by_user_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"),
    db.query("CREATE INDEX IF NOT EXISTS applications_candidate_tracking_idx ON applications (candidate_user_id, created_at DESC)"),
    db.query("CREATE INDEX IF NOT EXISTS application_status_history_lookup_idx ON application_status_history (application_id, created_at ASC)"),
  ]);
  await db.query("UPDATE applications SET status='Applied' WHERE status IS NULL OR status IN ('Pending', 'Approved')");
  await db.query("UPDATE applications SET status='Not Selected' WHERE status='Rejected'");
}

async function ensureGovernmentJobAgentTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS government_job_sources (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE government_job_sources ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'national'");
  await db.query("ALTER TABLE government_job_drafts ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'national'");
  await db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS government_state TEXT NOT NULL DEFAULT 'national'");

  await db.query(`
    CREATE TABLE IF NOT EXISTS government_job_drafts (
      id SERIAL PRIMARY KEY,
      source_id INTEGER,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      apply_link TEXT NOT NULL UNIQUE,
      visa_sponsorship BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);

  try {
    const configuredSources = JSON.parse(process.env.GOVERNMENT_JOB_SOURCES || "[]");
    if (Array.isArray(configuredSources)) {
      for (const source of configuredSources) {
        if (source?.name && source?.url) {
          await db.query(
            `INSERT INTO government_job_sources (name, url)
             VALUES ($1, $2)
             ON CONFLICT (url) DO NOTHING`,
            [String(source.name).trim(), String(source.url).trim()]
          );
        }
      }
    }
  } catch (error) {
    console.log("GOVERNMENT_JOB_SOURCES must be valid JSON:", error.message);
  }
}

const governmentStateNames = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"];
const governmentStateMarkers = {
  "Andhra Pradesh": ["andhra", "ap.gov.in", "ap.gov"], "Arunachal Pradesh": ["arunachal", "ar.gov.in"], "Assam": ["assam", "assam.gov.in"], "Bihar": ["bihar", "bihar.gov.in"], "Chhattisgarh": ["chhattisgarh", "cg.gov.in"], "Goa": ["goa.gov.in", "goa"], "Gujarat": ["gujarat", "gujarat.gov.in"], "Haryana": ["haryana", "hry.gov.in"], "Himachal Pradesh": ["himachal", "hp.gov.in"], "Jharkhand": ["jharkhand", "jharkhand.gov.in"], "Karnataka": ["karnataka", "kar.gov.in"], "Kerala": ["kerala", "kerala.gov.in"], "Madhya Pradesh": ["madhya", "mp.gov.in"], "Maharashtra": ["maharashtra", "maha.gov.in"], "Manipur": ["manipur", "manipur.gov.in"], "Meghalaya": ["meghalaya", "meghalaya.gov.in"], "Mizoram": ["mizoram", "mizoram.gov.in"], "Nagaland": ["nagaland", "nagaland.gov.in"], "Odisha": ["odisha", "orissa", "odisha.gov.in"], "Punjab": ["punjab", "punjab.gov.in"], "Rajasthan": ["rajasthan", "rajasthan.gov.in"], "Sikkim": ["sikkim", "sikkim.gov.in"], "Tamil Nadu": ["tamil nadu", "tn.gov.in", "tamilnad"], "Telangana": ["telangana", "telangana.gov.in", "tg.gov.in"], "Tripura": ["tripura", "tripura.gov.in"], "Uttar Pradesh": ["uttar pradesh", "up.gov.in", "upsssc", "uppsc"], "Uttarakhand": ["uttarakhand", "uk.gov.in"], "West Bengal": ["west bengal", "wb.gov.in"], "Delhi": ["delhi.gov.in", "nct delhi"], "Jammu and Kashmir": ["jammu", "kashmir", "jk.gov.in"], "Ladakh": ["ladakh", "ladakh.gov.in"], "Puducherry": ["puducherry", "py.gov.in"]
};
function governmentRegionFor(...values) {
  const text = values.join(" ").toLowerCase();
  const match = governmentStateNames.find((state) => text.includes(state.toLowerCase()));
  if (match) return match;
  return Object.entries(governmentStateMarkers).find(([, markers]) => markers.some((marker) => text.includes(marker)))?.[0] || "national";
}

async function classifyExistingGovernmentJobs() {
  const result = await db.query("SELECT j.id, j.title, j.company, j.location, s.url AS source_url, s.state AS source_state FROM jobs j LEFT JOIN government_job_sources s ON LOWER(s.name)=LOWER(j.company) WHERE j.job_category='Government' AND (j.government_state='national' OR j.government_state IS NULL)");
  await Promise.all(result.rows.map((job) => {
    const state = job.source_state && job.source_state !== "national" ? job.source_state : governmentRegionFor(job.title, job.company, job.location, job.source_url);
    return state === "national" ? Promise.resolve() : db.query("UPDATE jobs SET government_state=$1::text, location=$2::varchar WHERE id=$3", [state, state, job.id]);
  }));
}

async function ensureCompanyJobAgentTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS company_job_sources (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      job_category TEXT NOT NULL DEFAULT 'Private',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS company_job_drafts (
      id SERIAL PRIMARY KEY,
      source_id INTEGER,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      job_category TEXT NOT NULL DEFAULT 'Private',
      title TEXT NOT NULL,
      apply_link TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);

  // Existing Railway databases already have this table, so add the new
  // classification field safely during startup as well.
  await Promise.all([
    db.query("ALTER TABLE company_job_sources ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'global'"),
    db.query("ALTER TABLE company_job_sources ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ"),
    db.query("ALTER TABLE company_job_sources ADD COLUMN IF NOT EXISTS last_scan_error TEXT"),
    db.query("ALTER TABLE company_job_sources ADD COLUMN IF NOT EXISTS last_found_count INTEGER NOT NULL DEFAULT 0"),
    db.query("ALTER TABLE company_job_sources ADD COLUMN IF NOT EXISTS scan_failure_count INTEGER NOT NULL DEFAULT 0"),
    db.query("ALTER TABLE company_job_drafts ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'global'"),
    db.query("ALTER TABLE company_job_drafts ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN NOT NULL DEFAULT FALSE"),
  ]);

  // Sources added before country tracking existed are repaired during startup.
  const sources = await db.query("SELECT id, name, url, country FROM company_job_sources");
  for (const source of sources.rows) {
    const inferredCountry = inferSourceCountry(source.name, source.url);
    if ((source.country === "global" || !source.country) && inferredCountry !== "global") {
      await db.query("UPDATE company_job_sources SET country=$1 WHERE id=$2", [inferredCountry, source.id]);
    }
  }
  await db.query(`UPDATE company_job_drafts d SET country=s.country
    FROM company_job_sources s
    WHERE d.source_id=s.id AND (d.country IS NULL OR d.country='global') AND s.country <> 'global'`);
  // The public country selector uses ISO "gb" (not the legacy "uk" value).
  // EU-wide resources are intentionally available to every country filter.
  await Promise.all([
    db.query("UPDATE company_job_sources SET country='gb' WHERE country='uk'"),
    db.query("UPDATE company_job_drafts SET country='gb' WHERE country='uk'"),
    db.query("UPDATE jobs SET country='gb' WHERE country='uk'"),
    db.query("UPDATE company_job_sources SET country='global' WHERE country='eu'"),
    db.query("UPDATE company_job_drafts SET country='global' WHERE country='eu'"),
    db.query("UPDATE jobs SET country='global' WHERE country='eu'"),
  ]);
  await db.query(`UPDATE jobs j SET country=s.country
    FROM company_job_sources s
    WHERE LOWER(j.company)=LOWER(s.name) AND j.employer_id IS NULL
      AND j.job_category='Private' AND (j.country IS NULL OR j.country IN ('', 'in', 'global'))
      AND s.country <> 'global'`);

  // Keep a small, verified correction list for resources whose old careers
  // endpoint has moved. More links can be added after official verification.
  await db.query(
    "UPDATE company_job_sources SET url=$1, enabled=TRUE, last_scan_error=NULL, scan_failure_count=0 WHERE name='ALDI Sud Germany'",
    ["https://jobs.aldi-sued.de/viewalljobs/?locale=de_DE"]
  );

  // Do not repeatedly hit endpoints that are conclusively unavailable or
  // unsafe. They remain visible in the dashboard and can be retried later.
  await db.query(`UPDATE company_job_sources
    SET enabled=FALSE,
        last_scan_error=CASE WHEN last_scan_error LIKE 'Paused:%' THEN last_scan_error ELSE 'Paused: unavailable or unsafe resource. ' || last_scan_error END
    WHERE enabled=TRUE AND last_scan_error IS NOT NULL
      AND last_scan_error ~* 'status code 404|enotfound|certificate has expired|self-signed certificate|unable to verify the first certificate|hostname/ip does not match certificate|unsupported protocol'`);
}

function inferSourceCountry(...values) {
  const text = values.join(" ").toLowerCase();
  const namedCountries = [
    ["united states", "us"], ["usa", "us"], ["united kingdom", "gb"], [" uk ", "gb"],
    ["germany", "de"], ["deutschland", "de"], ["canada", "ca"], ["australia", "au"],
    ["new zealand", "nz"], ["ireland", "ie"], ["france", "fr"], ["spain", "es"], ["italy", "it"],
    ["netherlands", "nl"], ["poland", "pl"], ["finland", "fi"], ["denmark", "dk"], ["sweden", "se"],
    ["norway", "no"], ["belgium", "be"], ["switzerland", "ch"], ["austria", "at"], ["portugal", "pt"],
    ["india", "in"], ["japan", "jp"], ["south korea", "kr"], ["korea", "kr"], ["singapore", "sg"],
    ["malaysia", "my"], ["indonesia", "id"], ["philippines", "ph"], ["vietnam", "vn"], ["thailand", "th"],
    ["china", "cn"], ["taiwan", "tw"], ["pakistan", "pk"], ["bangladesh", "bd"], ["brazil", "br"],
    ["mexico", "mx"], ["argentina", "ar"], ["colombia", "co"], ["chile", "cl"], ["peru", "pe"],
    ["south africa", "za"], ["nigeria", "ng"], ["kenya", "ke"], ["egypt", "eg"], ["saudi", "sa"],
    ["united arab emirates", "ae"], ["uae", "ae"], ["turkey", "tr"], ["türkiye", "tr"], ["russia", "ru"],
  ];
  const named = namedCountries.find(([name]) => text.includes(name));
  if (named) return named[1];
  try {
    const host = new URL(values.find((value) => String(value || "").startsWith("http")) || "").hostname.toLowerCase();
    if (host.endsWith(".co.uk")) return "gb";
    const tld = host.split(".").pop();
    return /^[a-z]{2}$/.test(tld) && !["io", "ai", "tv"].includes(tld) ? tld : "global";
  } catch { return "global"; }
}

const visaJobDefaultSources = [
  ["Canada Job Bank", "https://www.jobbank.gc.ca/findajob/foreign-candidates", "ca"],
  ["Make it in Germany", "https://www.make-it-in-germany.com/en/working-in-germany/job-listings", "de"],
  ["UK Find a Job", "https://findajob.dwp.gov.uk/", "gb"],
  ["Workforce Australia", "https://www.workforceaustralia.gov.au/", "au"],
  ["JobsIreland", "https://www.jobsireland.ie/", "ie"],
  ["Work in Finland", "https://tyomarkkinatori.fi/en", "fi"],
  ["Work in Denmark", "https://www.workindenmark.dk/", "dk"],
  ["France Travail", "https://www.francetravail.fr/", "fr"],
  ["Netherlands Werk.nl", "https://www.werk.nl/", "nl"],
  ["Sweden Platsbanken", "https://arbetsformedlingen.se/other-languages/english-engelska/work-in-sweden", "se"],
  ["Singapore MyCareersFuture", "https://www.mycareersfuture.gov.sg/", "sg"],
  ["EURES European Job Network", "https://eures.europa.eu/index_en", "global"],
  ["Relocate.me", "https://relocate.me/", "global"],
  ["Visa Jobs", "https://www.visajobs.com/", "global"],
  ["MyVisaJobs", "https://www.myvisajobs.com/", "us"],
  ["Jobbatical Jobs", "https://jobbatical.com/jobs", "global"],
  ["New Zealand Government Jobs", "https://jobs.govt.nz/", "nz"],
  ["Poland ePraca", "https://oferty.praca.gov.pl/portal/pl", "pl"],
  ["Brazil Emprega Brasil", "https://empregabrasil.trabalho.gov.br/", "br"],
  ["South African Government Jobs", "https://www.gov.za/jobs", "za"],
  ["South Africa SITA eRecruitment", "https://www.eservices.gov.za/eRecruitmentCitizen/Vacancy/BrowseVacancy/1", "za"],
  ["India National Career Service", "https://www.ncs.gov.in/Pages/Search.aspx?OT=National+Career+Service+portal", "in"],
  ["Japan Hello Work", "https://www.hellowork.mhlw.go.jp/", "jp"],
  ["Philippines PhilJobNet", "https://philjobnet.gov.ph/job-vacancies/?c=1", "ph"],
  ["Malaysia MYFutureJobs", "https://myfuturejobs.gov.my/home-1/", "my"],
  ["Portugal IEFP Online", "https://iefponline.iefp.pt/", "pt"],
  ["Italy Cliclavoro", "https://www.cliclavoro.gov.it/", "it"],
  ["Norway NAV Jobs", "https://arbeidsplassen.nav.no/stillinger", "no"],
  ["Estonia Unemployment Insurance Fund", "https://www.tootukassa.ee/en", "ee"],
  ["Croatia Employment Service", "https://www.hzz.hr/en/", "hr"],
  ["Latvia State Employment Agency", "https://www.nva.gov.lv/en", "lv"],
  ["Lithuania Employment Service", "https://uzt.lt/en/", "lt"],
  ["Romania National Employment Agency", "https://www.anofm.ro/", "ro"],
  ["Greece Public Employment Service", "https://www.dypa.gov.gr/en", "gr"],
  ["Türkiye İşkur", "https://www.iskur.gov.tr/en/", "tr"],
  ["Spain Empléate", "https://empleate.gob.es/empleo/", "es"],
  ["Belgium Actiris", "https://www.actiris.brussels/en/citizens/jobseekers/", "be"],
];

// These are official national or public job boards expressly intended to help
// overseas applicants find work. Individual listings often do not repeat the
// phrase "visa sponsorship", so rejecting them solely on that phrase leaves
// their country with no results (notably Germany's official Make it in Germany board).
const trustedVisaListingSources = new Set([
  "Canada Job Bank", "Make it in Germany", "UK Find a Job", "Workforce Australia",
  "JobsIreland", "Work in Finland", "Work in Denmark", "France Travail",
  "Netherlands Werk.nl", "Sweden Platsbanken", "Singapore MyCareersFuture",
  "EURES European Job Network", "New Zealand Government Jobs", "Poland ePraca",
  "Brazil Emprega Brasil", "South African Government Jobs", "South Africa SITA eRecruitment",
  "India National Career Service", "Japan Hello Work", "Philippines PhilJobNet",
  "Malaysia MYFutureJobs", "Portugal IEFP Online", "Italy Cliclavoro", "Norway NAV Jobs",
  "Estonia Unemployment Insurance Fund", "Croatia Employment Service", "Latvia State Employment Agency",
  "Lithuania Employment Service", "Romania National Employment Agency", "Greece Public Employment Service",
  "Türkiye İşkur", "Spain Empléate", "Belgium Actiris",
]);

async function ensureVisaJobAgentTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS visa_job_sources (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL DEFAULT 'global', enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await Promise.all([
    db.query("ALTER TABLE visa_job_sources ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ"),
    db.query("ALTER TABLE visa_job_sources ADD COLUMN IF NOT EXISTS last_scan_error TEXT"),
    db.query("ALTER TABLE visa_job_sources ADD COLUMN IF NOT EXISTS last_found_count INTEGER NOT NULL DEFAULT 0"),
  ]);
  await db.query(`CREATE TABLE IF NOT EXISTS visa_job_drafts (
    id SERIAL PRIMARY KEY, source_id INTEGER, source_name TEXT NOT NULL, source_url TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'global', title TEXT NOT NULL, apply_link TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ)`);
  for (const [name, url, country] of visaJobDefaultSources) {
    await db.query("INSERT INTO visa_job_sources (name, url, country) VALUES ($1, $2, $3) ON CONFLICT (url) DO NOTHING", [name, url, country]);
  }
}

function cleanGovernmentJobText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findGovernmentJobLinks(html, sourceUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const keywords = /recruit|vacan|employment|notification|advertisement|exam|appointment|post|job|career|opening|opportunit/i;
  let match;

  while ((match = pattern.exec(html)) && links.length < 30) {
    const title = cleanGovernmentJobText(match[2]);
    let applyLink;
    try {
      applyLink = new URL(match[1], sourceUrl).href;
    } catch {
      continue;
    }

    if (title.length < 8 || !keywords.test(`${title} ${applyLink}`)) continue;
    // Many career sites include visa eligibility beside the job-card link.
    // Keep a small local context so we can classify only explicit matches.
    const context = cleanGovernmentJobText(html.slice(
      Math.max(0, match.index - 900),
      Math.min(html.length, match.index + match[0].length + 900)
    ));
    links.push({ title: title.slice(0, 300), applyLink, context });
  }

  return [...new Map(links.map((item) => [item.applyLink, item])).values()];
}

function hasVisaSponsorship(text) {
  const value = String(text || "").toLowerCase();
  const negative = /(?:no|not|without|unable to provide|cannot provide|can't provide)\s+(?:a\s+)?(?:visa\s+)?sponsor(?:ship)?|(?:visa\s+)?sponsorship\s+(?:is\s+)?not\s+(?:available|offered)|must\s+(?:already\s+)?have\s+(?:the\s+)?right\s+to\s+work/;
  const positive = /visa\s+sponsor(?:ship)?(?:\s+(?:available|provided|offered))?|sponsorship\s+(?:available|provided|offered)|work\s+visa\s+(?:support|provided|available)|skilled\s+worker\s+sponsor(?:ship)?|relocation\s+(?:and\s+)?visa\s+(?:support|assistance)/;
  return positive.test(value) && !negative.test(value);
}

async function hasVisaSponsorshipOnJobPage(listing) {
  // Career index pages often show only a title. Check a small number of the
  // actual opening pages as well, where eligibility is normally written.
  if (hasVisaSponsorship(`${listing.title} ${listing.applyLink} ${listing.context}`)) return true;
  if (!isSafeCompanySourceUrl(listing.applyLink)) return false;

  try {
    const response = await axios.get(listing.applyLink, {
      timeout: 5000,
      responseType: "text",
      maxContentLength: 750000,
      headers: { "User-Agent": "MarketlenceJobsBot/1.0 (visa-sponsorship-review-agent)" },
    });
    return hasVisaSponsorship(cleanGovernmentJobText(String(response.data || "").slice(0, 120000)));
  } catch {
    return false;
  }
}

async function scanGovernmentJobSources() {
  const { rows: sources } = await db.query(
    "SELECT id, name, url, state FROM government_job_sources WHERE enabled = TRUE"
  );
  let discovered = 0;

  for (const source of sources) {
    try {
      const response = await axios.get(source.url, {
        timeout: 15000,
        responseType: "text",
        headers: { "User-Agent": "MarketlenceJobsBot/1.0 (government-job-review-agent)" },
      });
      const listings = findGovernmentJobLinks(response.data, source.url);

      for (const listing of listings) {
        const inserted = await db.query(
          `INSERT INTO government_job_drafts (source_id, source_name, source_url, title, apply_link, state)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (apply_link) DO NOTHING
           RETURNING id`,
          [source.id, source.name, source.url, listing.title, listing.applyLink, source.state === "national" ? governmentRegionFor(source.name, listing.title, source.url) : source.state]
        );
        if (inserted.rows.length) discovered += 1;
      }
    } catch (error) {
      console.log(`Government job source scan failed for ${source.name}:`, error.message);
    }
  }

  return { sourcesChecked: sources.length, discovered };
}

function startGovernmentJobAgent() {
  if (process.env.GOVERNMENT_JOB_AGENT_ENABLED !== "true") return;
  const intervalHours = Math.max(1, Number(process.env.GOVERNMENT_JOB_SCAN_HOURS) || 6);
  setTimeout(() => scanGovernmentJobSources().catch((error) => console.log(error)), 30000);
  setInterval(() => scanGovernmentJobSources().catch((error) => console.log(error)), intervalHours * 60 * 60 * 1000);
  console.log(`Government Job Agent enabled: scanning every ${intervalHours} hours.`);
}

function isSafeCompanySourceUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || hostname === "localhost" || !hostname.includes(".")) return false;
    return !/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
  } catch {
    return false;
  }
}

function companySourceFailurePolicy(errorMessage) {
  const message = String(errorMessage || "").toLowerCase();
  const permanentlyUnavailable = /status code 404|enotfound|certificate has expired|self-signed certificate|unable to verify the first certificate|hostname\/ip does not match certificate|unsupported protocol/.test(message);
  const blockedOrUnreliable = /status code 403|status code 405|status code 406|status code 429|timeout|econnreset|econnrefused|eproto|socket hang up|maximum number of redirects/.test(message);
  return { pauseAfter: permanentlyUnavailable ? 1 : blockedOrUnreliable ? 3 : 4, reason: permanentlyUnavailable ? "unavailable" : blockedOrUnreliable ? "blocked or unreliable" : "repeated scan failure" };
}

async function markCompanySourceScanFailure(source, error) {
  const message = cleanText(error?.message || "Could not reach this resource.", 500);
  const policy = companySourceFailurePolicy(message);
  const failures = Number(source.scan_failure_count || 0) + 1;
  const paused = failures >= policy.pauseAfter;
  await db.query(
    `UPDATE company_job_sources
     SET last_scan_at=NOW(), last_scan_error=$1, last_found_count=0,
         scan_failure_count=$2, enabled=CASE WHEN $3 THEN FALSE ELSE enabled END
     WHERE id=$4`,
    [paused ? `Paused: ${policy.reason}. ${message}` : message, failures, paused, source.id]
  );
}

async function scanCompanyJobSources() {
  if (companyJobScanRunning) return { running: true, sourcesChecked: 0, discovered: 0, unavailable: 0 };

  companyJobScanRunning = true;

  try {
    const { rows: sources } = await db.query(
      "SELECT id, name, url, job_category, country, scan_failure_count FROM company_job_sources WHERE enabled = TRUE"
    );
    let discovered = 0;
    let unavailable = 0;

    // Scan a small group at a time. This is much faster than one-by-one while
    // remaining polite to the career sites being checked.
    for (let index = 0; index < sources.length; index += 6) {
      const group = sources.slice(index, index + 6);
      const groupResults = await Promise.all(group.map(async (source) => {
        try {
          const response = await axios.get(source.url, {
            timeout: 7000,
            responseType: "text",
            headers: { "User-Agent": "MarketlenceJobsBot/1.0 (company-job-review-agent)" },
          });
          const listings = findGovernmentJobLinks(response.data, source.url);
          let found = 0;

          // Limit extra job-detail checks so the scanner remains reliable even
          // with the large worldwide source list. Visible page text is always
          // checked; the first five listings also get a detail-page check.
          const visaMatches = new Map();
          await Promise.all(listings.slice(0, 5).map(async (listing) => {
            visaMatches.set(listing.applyLink, await hasVisaSponsorshipOnJobPage(listing));
          }));

          for (const listing of listings) {
            const visaSponsorship = visaMatches.get(listing.applyLink)
              || hasVisaSponsorship(`${listing.title} ${listing.applyLink} ${listing.context}`);
            const inserted = await db.query(
              `INSERT INTO company_job_drafts (source_id, source_name, source_url, job_category, country, title, apply_link, visa_sponsorship)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (apply_link) DO UPDATE
               SET visa_sponsorship = TRUE
               WHERE company_job_drafts.status = 'pending'
                 AND EXCLUDED.visa_sponsorship = TRUE
               RETURNING id, (xmax = 0) AS was_inserted`,
              [source.id, source.name, source.url, source.job_category, source.country || inferSourceCountry(source.name, source.url), listing.title, listing.applyLink, visaSponsorship]
            );
            if (inserted.rows[0]?.was_inserted) found += 1;
          }
          await db.query("UPDATE company_job_sources SET last_scan_at=NOW(), last_scan_error=NULL, last_found_count=$1, scan_failure_count=0 WHERE id=$2", [found, source.id]);
          return { found, unavailable: false };
        } catch (error) {
          // A careers website may block automated access, move its page, or
          // have a certificate problem. Skip it and continue with all others.
          await markCompanySourceScanFailure(source, error).catch(() => {});
          return { found: 0, unavailable: true };
        }
      }));
      discovered += groupResults.reduce((total, result) => total + result.found, 0);
      unavailable += groupResults.filter((result) => result.unavailable).length;
    }

    const summary = { running: false, sourcesChecked: sources.length, discovered, unavailable };
    console.log(`Company job scan complete: ${discovered} new openings from ${sources.length - unavailable}/${sources.length} available sources.`);
    return summary;
  } finally {
    companyJobScanRunning = false;
  }
}

function startCompanyJobAgent() {
  if (process.env.COMPANY_JOB_AGENT_ENABLED !== "true") return;
  const intervalHours = Math.max(1, Number(process.env.COMPANY_JOB_SCAN_HOURS) || 6);
  setTimeout(() => scanCompanyJobSources().catch((error) => console.log(error)), 45000);
  setInterval(() => scanCompanyJobSources().catch((error) => console.log(error)), intervalHours * 60 * 60 * 1000);
  console.log(`Company Job Agent enabled: scanning every ${intervalHours} hours.`);
}

async function scanVisaJobSources() {
  if (visaJobScanRunning) return { running: true, sourcesChecked: 0, discovered: 0 };
  visaJobScanRunning = true;
  try {
    const { rows: sources } = await db.query("SELECT id, name, url, country FROM visa_job_sources WHERE enabled = TRUE");
    let discovered = 0;
    for (let index = 0; index < sources.length; index += 4) {
      const results = await Promise.all(sources.slice(index, index + 4).map(async (source) => {
        try {
          const response = await axios.get(source.url, { timeout: 8000, responseType: "text", headers: { "User-Agent": "MarketlenceJobsBot/1.0 (visa-job-review-agent)" } });
          const listings = findGovernmentJobLinks(response.data, source.url);
          const checks = new Map();
          await Promise.all(listings.slice(0, 8).map(async (listing) => checks.set(listing.applyLink, await hasVisaSponsorshipOnJobPage(listing))));
          let found = 0;
          for (const listing of listings) {
            const sponsored = trustedVisaListingSources.has(source.name)
              || checks.get(listing.applyLink)
              || hasVisaSponsorship(`${listing.title} ${listing.context} ${listing.applyLink}`);
            if (!sponsored) continue;
            const inserted = await db.query(`INSERT INTO visa_job_drafts (source_id, source_name, source_url, country, title, apply_link)
              VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (apply_link) DO NOTHING RETURNING id`,
              [source.id, source.name, source.url, source.country, listing.title, listing.applyLink]);
            if (inserted.rows.length) found += 1;
          }
          await db.query("UPDATE visa_job_sources SET last_scan_at=NOW(), last_scan_error=NULL, last_found_count=$1 WHERE id=$2", [found, source.id]);
          return found;
        } catch (error) {
          await db.query("UPDATE visa_job_sources SET last_scan_at=NOW(), last_scan_error=$1, last_found_count=0 WHERE id=$2", [cleanText(error.message, 500), source.id]).catch(() => {});
          return 0;
        }
      }));
      discovered += results.reduce((total, value) => total + value, 0);
    }
    console.log(`Visa sponsorship scan complete: ${discovered} new sponsored openings.`);
    return { running: false, sourcesChecked: sources.length, discovered };
  } finally { visaJobScanRunning = false; }
}

function startVisaJobAgent() {
  if (process.env.VISA_JOB_AGENT_ENABLED !== "true") return;
  const intervalHours = Math.max(1, Number(process.env.VISA_JOB_SCAN_HOURS) || 12);
  setTimeout(() => scanVisaJobSources().catch((error) => console.log(error)), 60000);
  setInterval(() => scanVisaJobSources().catch((error) => console.log(error)), intervalHours * 60 * 60 * 1000);
  console.log(`Visa Sponsorship Jobs Agent enabled: scanning every ${intervalHours} hours.`);
}

async function sendNewJobNotification(job) {
  if (!pushNotificationsEnabled) return;

  try {
    const { rows } = await db.query(
      "SELECT endpoint, subscription FROM push_subscriptions"
    );
    const payload = JSON.stringify({
      title: "New job on Marketlence Jobs",
      body: `${job.title} at ${job.company}${job.location ? ` - ${job.location}` : ""}`,
      url: `https://jobs.marketlence.com/jobs/${job.id}`,
    });

    await Promise.all(rows.map(async ({ endpoint, subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await db.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
        } else {
          console.error("Web push delivery failed:", error.message);
        }
      }
    }));
  } catch (error) {
    console.error("Could not send new-job notifications:", error.message);
  }
}

// Posts only after a job has been published. Secrets stay in Railway variables,
// never in the website or source code.
function isFacebookAutoPostingEnabled() {
  return process.env.FACEBOOK_AUTO_POST_ENABLED === "true"
    && Boolean(process.env.FACEBOOK_PAGE_ID)
    && Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

function buildFacebookJobPost(job) {
  const publicJobsUrl = (process.env.PUBLIC_JOBS_URL || "https://jobs.marketlence.com").replace(/\/$/, "");
  const lines = [
    `New opportunity: ${job.title}`,
    job.company && `Company: ${job.company}`,
    job.location && `Location: ${job.location}`,
    job.salary && `Salary: ${job.salary}`,
    job.lastDate && `Last date: ${job.lastDate}`,
    "",
    `Apply now: ${publicJobsUrl}/jobs/${job.id}`,
    "",
    "#MarketlenceJobs #Hiring #Jobs #CareerOpportunity",
  ].filter(Boolean);

  return lines.join("\n").slice(0, 5000);
}

async function postApprovedJobToFacebook(job) {
  if (!isFacebookAutoPostingEnabled()) return;

  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v22.0";
  const endpoint = `https://graph.facebook.com/${apiVersion}/${process.env.FACEBOOK_PAGE_ID}/feed`;
  const body = new URLSearchParams({
    message: buildFacebookJobPost(job),
    access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  });

  try {
    const response = await axios.post(endpoint, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    console.log(`Facebook Page post created for job ${job.id}: ${response.data?.id || "success"}`);
  } catch (error) {
    console.error(`Facebook Page post failed for job ${job.id}:`, error.response?.data?.error?.message || error.message);
  }
}

app.get("/api/push/public-key", (req, res) => {
  if (!pushNotificationsEnabled) {
    return res.status(503).json({ error: "Job notifications are not configured yet." });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post("/api/push/subscribe", async (req, res) => {
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "Invalid push subscription." });
  }

  try {
    await db.query(
      `INSERT INTO push_subscriptions (endpoint, subscription)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (endpoint)
       DO UPDATE SET subscription = EXCLUDED.subscription, created_at = NOW()`,
      [subscription.endpoint, JSON.stringify(subscription)]
    );
    res.status(201).json({ message: "Subscribed to job notifications." });
  } catch (error) {
    console.error("Could not save push subscription:", error.message);
    res.status(500).json({ error: "Could not save subscription." });
  }
});
app.get("/api/jobs", async (req, res) => {
  try {
    // Legacy/admin jobs do not have an employer_id. Employer-submitted jobs are
    // public only after an admin has approved them.
    const result = await db.query("SELECT * FROM jobs WHERE employer_id IS NULL OR employer_status = 'Live' ORDER BY is_featured DESC, posted_at DESC NULLS LAST, id DESC");

    const jobs = result.rows.map(job => ({
      ...job,
      applyLink: job.apply_link || null,
      chatbot_questions:
  Array.isArray(job.chatbot_questions)
    ? job.chatbot_questions
    : JSON.parse(job.chatbot_questions || "[]") // 👈 ADD HERE
    }));

    res.json(jobs);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching jobs");
  }
});
app.use("/uploads", express.static("uploads"));
app.post("/api/jobs", async (req, res) => {
   console.log("HIT /api/jobs");
  console.log("BODY RECEIVED:", req.body);

  const {
    title,
    company,
    location,
    salary,
    experience,
    skills,
    description,
    type,
    mode,
    chatbotQuestions,
    applyEnabled = true,
    applyLink = null,
    jobCategory = null,
    country = null,
    lastDate = null
  } = req.body;

  try {
    const sql = `
      INSERT INTO jobs
      (
        title,
        company,
        location,
        salary,
        experience,
        skills,
        description,
        type,
        mode,
        chatbot_questions,
        apply_enabled,
        apply_link,
        job_category,
        country,
        last_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `;

    const result = await db.query(`${sql} RETURNING id`, [
      title,
      company,
      location,
      salary,
      experience,
      skills,
      description,
      type,
      mode,
      chatbotQuestions ?? [],
      applyEnabled !== false,
      applyLink?.trim() || null,
      ["Private", "Government"].includes(jobCategory) ? jobCategory : null,
      String(country || "in").toLowerCase(),
      lastDate?.trim() || null
    ]);

    void sendNewJobNotification({
      id: result.rows[0].id,
      title,
      company,
      location,
    });
    void queueJobAlertForJob({ id: result.rows[0].id, title, company, location, salary, experience, skills, description, type, mode, job_category: jobCategory, last_date: lastDate });
    void postApprovedJobToFacebook({
      id: result.rows[0].id,
      title,
      company,
      location,
      salary,
      lastDate,
    });

    res.json({ message: "Job added ✅" });

  } catch (err) {
    console.log("🔥 FULL ERROR:", err); // 👈 IMPORTANT
    res.status(500).json({ error: err.message });
  }
});

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(403).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function isAdmin(req, res, next) {
  if (
    req.user.role !== "admin" &&
    req.user.role !== "superadmin"
  ) {
    return res.status(403).send("Access denied ❌");
  }
  next();
}

function isSuperAdmin(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      error: "Only super admin can perform this action ❌"
    });
  }
  next();
}

async function isEmployer(req, res, next) {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Employer access required" });
  try {
    const result = await db.query("SELECT employer_suspended FROM users WHERE id=$1", [req.user.id]);
    if (result.rows[0]?.employer_suspended) return res.status(403).json({ error: "This employer account is suspended." });
    next();
  } catch { return res.status(500).json({ error: "Could not verify employer account." }); }
}

function cleanText(value, max = 5000) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function makeJobSlug(title, company, id) {
  return `${cleanText(title, 120)}-${cleanText(company, 80)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 180) + `-${id}`;
}

const employerPostAttempts = new Map();
const featuredPlans = {
  featured_11: { id: "featured_11", name: "Featured for 11 days", amount: 29900, days: 11 },
  featured_29: { id: "featured_29", name: "Featured for 29 days", amount: 49900, days: 29 },
};
function employerPostingRateLimit(req, res, next) {
  const previous = employerPostAttempts.get(req.user.id) || 0;
  const remaining = 60 * 1000 - (Date.now() - previous);
  if (remaining > 0) return res.status(429).json({ error: "Please wait one minute before posting another job." });
  next();
}

async function ensureEmployerPostingTables() {
  await Promise.all([
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_verified BOOLEAN NOT NULL DEFAULT FALSE"),
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_suspended BOOLEAN NOT NULL DEFAULT FALSE"),
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_email_verified BOOLEAN NOT NULL DEFAULT FALSE"),
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_email_verified_at TIMESTAMPTZ"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employer_id INTEGER"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employer_status TEXT NOT NULL DEFAULT 'Live'"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_slug TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_clicks INTEGER NOT NULL DEFAULT 0"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_start_date TIMESTAMPTZ"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_end_date TIMESTAMPTZ"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS plan_id TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_status TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_priority INTEGER NOT NULL DEFAULT 0"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS roles_responsibilities TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS openings INTEGER"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_method TEXT"),
    db.query("CREATE TABLE IF NOT EXISTS employer_profiles (user_id INTEGER PRIMARY KEY, full_name TEXT, mobile TEXT, company_name TEXT NOT NULL, website TEXT, company_type TEXT, industry TEXT, company_size TEXT, description TEXT, address TEXT, city TEXT, state TEXT, logo_url TEXT, contact_email TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"),
    db.query("CREATE TABLE IF NOT EXISTS employer_job_events (id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL, event_type TEXT NOT NULL, visitor_key TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"),
    db.query("CREATE TABLE IF NOT EXISTS employer_feature_payments (id SERIAL PRIMARY KEY, employer_id INTEGER NOT NULL, job_id INTEGER NOT NULL, plan_id TEXT NOT NULL, amount_paise INTEGER NOT NULL, duration_days INTEGER NOT NULL, razorpay_order_id TEXT UNIQUE, razorpay_payment_id TEXT UNIQUE, payment_status TEXT NOT NULL DEFAULT 'created', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ)"),
    db.query("CREATE TABLE IF NOT EXISTS featured_job_events (id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL, event_type TEXT NOT NULL, placement TEXT NOT NULL, visitor_key TEXT, candidate_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"),
    db.query("CREATE INDEX IF NOT EXISTS featured_jobs_active_idx ON jobs (is_featured, featured_start_date, featured_end_date, employer_status)"),
    db.query("CREATE INDEX IF NOT EXISTS featured_job_events_lookup_idx ON featured_job_events (job_id, event_type, placement, visitor_key, created_at DESC)"),
  ]);
}

async function ensureJobAlertTables() {
  await Promise.all([
    db.query("CREATE TABLE IF NOT EXISTS candidate_job_alert_preferences (candidate_id INTEGER PRIMARY KEY, email_enabled BOOLEAN NOT NULL DEFAULT FALSE, frequency TEXT NOT NULL DEFAULT 'daily', preferred_locations TEXT NOT NULL DEFAULT '', preferred_categories TEXT NOT NULL DEFAULT '', preferred_titles TEXT NOT NULL DEFAULT '', min_salary TEXT, experience TEXT, work_modes TEXT NOT NULL DEFAULT '', job_types TEXT NOT NULL DEFAULT '', consent_at TIMESTAMPTZ, consent_source TEXT, unsubscribed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"),
    db.query("CREATE TABLE IF NOT EXISTS job_alert_notifications (id SERIAL PRIMARY KEY, candidate_id INTEGER NOT NULL, job_id INTEGER NOT NULL, notification_type TEXT NOT NULL DEFAULT 'job_alert', match_score INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'queued', provider_message_id TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(candidate_id, job_id, notification_type))"),
    db.query("CREATE INDEX IF NOT EXISTS job_alert_preferences_enabled_idx ON candidate_job_alert_preferences (email_enabled, frequency)"),
    db.query("CREATE INDEX IF NOT EXISTS job_alert_notifications_queue_idx ON job_alert_notifications (status, created_at)"),
  ]);
}

const jobAlertWeights = { title: 30, skills: 25, location: 20, experience: 15, category: 10 };
const alertWords = (value) => [...new Set(String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 1))];
const overlap = (a, b) => alertWords(a).filter((word) => alertWords(b).includes(word)).length;
function jobAlertScore(candidate, preference, job) {
  let score = 0;
  const titleMatches = overlap(`${preference.preferred_titles} ${candidate.projects || ""}`, job.title);
  const skillMatches = overlap(candidate.skills, `${job.skills} ${job.title} ${job.description}`);
  if (titleMatches) score += Math.min(jobAlertWeights.title, titleMatches * 10);
  if (skillMatches) score += Math.min(jobAlertWeights.skills, skillMatches * 6);
  const locations = `${preference.preferred_locations} ${candidate.bio || ""}`.toLowerCase();
  if (locations && alertWords(locations).some((word) => String(job.location || "").toLowerCase().includes(word))) score += jobAlertWeights.location;
  if (preference.preferred_categories && String(job.job_category || "").toLowerCase().includes(String(preference.preferred_categories).toLowerCase())) score += jobAlertWeights.category;
  const candidateYears = Number((String(preference.experience || candidate.experience || "").match(/\d+/) || [])[0]); const jobYears = Number((String(job.experience || "").match(/\d+/) || [])[0]);
  if (candidateYears && jobYears && candidateYears >= jobYears) score += jobAlertWeights.experience;
  return score;
}
function jobAlertUrl(job) { return `https://jobs.marketlence.com/jobs/${job.job_slug || job.id}?utm_source=email&utm_medium=job_alert`; }
function unsubscribeToken(candidateId) { return jwt.sign({ candidateId, purpose: "job-alert-unsubscribe" }, process.env.JWT_SECRET, { expiresIn: "365d" }); }
function jobAlertEmailHtml(candidate, jobs) { const un = encodeURIComponent(unsubscribeToken(candidate.id)); const cards = jobs.map(({ job }) => `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0"><b style="font-size:18px">${job.title}</b><p>${job.company} · ${job.location}</p><p>${job.experience || "Experience not specified"} · ${job.salary || "Salary not disclosed"}</p><a href="${jobAlertUrl(job)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">View Job</a></div>`).join(""); return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h1 style="color:#1d4ed8">MarketLence Jobs</h1><p>Hi ${candidate.username || "there"},</p><p>We found new opportunities that may match your profile.</p>${cards}<p><a href="https://jobs.marketlence.com/jobs">View All Matching Jobs</a></p><hr/><p style="font-size:12px;color:#64748b">You are receiving this email because you enabled job alerts on MarketLence Jobs. <a href="https://jobs.marketlence.com/candidate/job-alerts">Manage Job Alerts</a> · <a href="https://humorous-fulfillment-production-1f5e.up.railway.app/api/job-alerts/unsubscribe?token=${un}">Unsubscribe</a></p></div>`; }
async function sendQueuedJobAlerts(frequency) {
  if (process.env.JOB_ALERTS_ENABLED !== "true") return;
  const queued = await db.query(`SELECT n.id AS notification_id, n.candidate_id, u.username, u.email, j.* FROM job_alert_notifications n JOIN candidate_job_alert_preferences p ON p.candidate_id=n.candidate_id JOIN users u ON u.id=n.candidate_id JOIN jobs j ON j.id=n.job_id WHERE n.status='queued' AND p.email_enabled=TRUE AND p.frequency=$1 AND (j.employer_id IS NULL OR j.employer_status='Live') ORDER BY n.created_at ASC LIMIT 500`, [frequency]);
  const groups = new Map(); queued.rows.forEach((row) => { const list = groups.get(row.candidate_id) || []; if (list.length < 10) list.push({ job: row, id: row.notification_id }); groups.set(row.candidate_id, list); });
  for (const [candidateId, entries] of groups) { const candidate = { ...entries[0].job, id: candidateId }; try { const response = await resend.emails.send({ from: "Marketlence Jobs <care@marketlence.com>", to: candidate.email, subject: `${candidate.username || "New"}, ${entries.length} new jobs match your profile`, html: jobAlertEmailHtml(candidate, entries) }); await db.query("UPDATE job_alert_notifications SET status='sent', sent_at=NOW(), provider_message_id=$1 WHERE id = ANY($2::int[])", [response.data?.id || null, entries.map((item) => item.id)]); } catch (error) { await db.query("UPDATE job_alert_notifications SET status='failed' WHERE id = ANY($1::int[])", [entries.map((item) => item.id)]); console.error("Job alert email failed:", error.message); } }
}
async function queueJobAlertForJob(job) {
  if (process.env.JOB_ALERTS_ENABLED !== "true") return;
  const candidates = await db.query("SELECT u.id, u.username, u.email, u.skills, u.experience, u.bio, u.projects, p.* FROM users u JOIN candidate_job_alert_preferences p ON p.candidate_id=u.id WHERE u.role='user' AND p.email_enabled=TRUE AND p.unsubscribed_at IS NULL LIMIT 1000");
  const threshold = Math.max(20, Number(process.env.JOB_ALERT_MIN_SCORE) || 40);
  for (const candidate of candidates.rows) { const score = jobAlertScore(candidate, candidate, job); if (score < threshold) continue; await db.query("INSERT INTO job_alert_notifications (candidate_id,job_id,match_score) VALUES ($1,$2,$3) ON CONFLICT (candidate_id,job_id,notification_type) DO NOTHING", [candidate.id, job.id, score]); }
  await sendQueuedJobAlerts("instant");
}
function startJobAlertAgent() { if (process.env.JOB_ALERTS_ENABLED !== "true") return; setTimeout(() => sendQueuedJobAlerts("daily").catch(console.error), 60000); setInterval(() => sendQueuedJobAlerts("daily").catch(console.error), 24 * 60 * 60 * 1000); setInterval(() => sendQueuedJobAlerts("weekly").catch(console.error), 7 * 24 * 60 * 60 * 1000); }

function optionalCandidate(req) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = token && jwt.verify(token, process.env.JWT_SECRET);
    return user?.role === "user" ? user : null;
  } catch { return null; }
}

async function activateFeaturedJob(payment) {
  if (payment.payment_status === "paid") return;
  await db.query("UPDATE employer_feature_payments SET payment_status='paid', paid_at=NOW() WHERE id=$1", [payment.id]);
  await db.query("UPDATE jobs SET is_featured=TRUE, featured_start_date=NOW(), featured_end_date=NOW() + ($1::text || ' days')::interval, plan_id=$2, promotion_status='featured' WHERE id=$3 AND employer_id=$4", [payment.duration_days, payment.plan_id, payment.job_id, payment.employer_id]);
}

async function deactivateExpiredFeaturedJobs() {
  await db.query("UPDATE jobs SET is_featured=FALSE, promotion_status='expired' WHERE is_featured=TRUE AND featured_end_date IS NOT NULL AND featured_end_date <= NOW()");
}

function employerOtpHash(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function safeOtpMatch(code, expectedHash) {
  const supplied = Buffer.from(employerOtpHash(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

app.post("/api/employers/send-email-otp", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid work email address." });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "Email verification is not configured yet. Please contact support." });

  const previous = employerEmailOtps.get(email);
  if (previous && Date.now() - previous.sentAt < EMPLOYER_EMAIL_OTP_RESEND_MS) {
    return res.status(429).json({ error: "Please wait one minute before requesting another code." });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  employerEmailOtps.set(email, {
    codeHash: employerOtpHash(code),
    expiresAt: Date.now() + EMPLOYER_EMAIL_OTP_TTL_MS,
    sentAt: Date.now(),
    attempts: 0,
  });

  try {
    await resend.emails.send({
      from: "Marketlence Jobs <care@marketlence.com>",
      to: email,
      subject: "Verify your Marketlence employer email",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your work email</h2><p>Use this code to finish creating your Marketlence Jobs employer account:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p></div>`,
    });
    res.json({ message: "Verification code sent. Please check your inbox." });
  } catch (error) {
    employerEmailOtps.delete(email);
    console.error("Employer verification email failed:", error.message);
    res.status(502).json({ error: "We could not send the verification code. Please try again." });
  }
});

app.post("/api/employers/verify-email-otp", (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const code = String(req.body?.code || "").trim();
  const record = employerEmailOtps.get(email);
  if (!record) return res.status(400).json({ error: "Request a new verification code first." });
  if (Date.now() > record.expiresAt) {
    employerEmailOtps.delete(email);
    return res.status(400).json({ error: "This verification code has expired. Request a new one." });
  }
  if (!/^\d{6}$/.test(code) || !safeOtpMatch(code, record.codeHash)) {
    record.attempts += 1;
    if (record.attempts >= EMPLOYER_EMAIL_OTP_MAX_ATTEMPTS) employerEmailOtps.delete(email);
    return res.status(400).json({ error: record.attempts >= EMPLOYER_EMAIL_OTP_MAX_ATTEMPTS ? "Too many incorrect attempts. Request a new code." : "That verification code is not correct." });
  }
  employerEmailOtps.delete(email);
  const verificationToken = jwt.sign({ purpose: "employer-email-verification", email }, process.env.JWT_SECRET, { expiresIn: "15m" });
  res.json({ message: "Email verified successfully.", verificationToken });
});

app.post("/api/employers/register", async (req, res) => {
  try {
    const { fullName, email, mobile, companyName, website, companyType, industry, companySize, city, state, password, emailVerificationToken } = req.body;
    const cleanEmail = String(email || "").toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || String(password || "").length < 8 || !cleanText(companyName, 200) || !cleanText(fullName, 120)) return res.status(400).json({ error: "Enter a valid work email, company name, full name, and an 8-character password." });
    if (website && !/^https:\/\//i.test(String(website))) return res.status(400).json({ error: "Company website must start with https://" });
    let verification;
    try { verification = jwt.verify(String(emailVerificationToken || ""), process.env.JWT_SECRET); } catch { return res.status(400).json({ error: "Verify your work email before creating an employer account." }); }
    if (verification?.purpose !== "employer-email-verification" || verification.email !== cleanEmail) return res.status(400).json({ error: "Verify this work email before creating an employer account." });
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length) return res.status(409).json({ error: "An account already exists for this email." });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = (await db.query("INSERT INTO users (username, email, password, role, is_approved, employer_email_verified, employer_email_verified_at) VALUES ($1,$2,$3,'employer',TRUE,TRUE,NOW()) RETURNING id, username, email, role", [cleanText(fullName, 120), cleanEmail, passwordHash])).rows[0];
    await db.query("INSERT INTO employer_profiles (user_id, full_name, mobile, company_name, website, company_type, industry, company_size, city, state, contact_email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [user.id, cleanText(fullName,120), cleanText(mobile,30), cleanText(companyName,200), cleanText(website,300), cleanText(companyType,100), cleanText(industry,120), cleanText(companySize,80), cleanText(city,120), cleanText(state,120), cleanEmail]);
    const token = jwt.sign({ id: user.id, email: user.email, role: "employer" }, process.env.JWT_SECRET);
    res.status(201).json({ token, role: "employer", userId: user.id, username: user.username });
  } catch (error) { console.error("Employer registration failed:", error.message); res.status(500).json({ error: "Could not create employer account." }); }
});
app.get("/api/featured-jobs", async (req, res) => {
  try {
    const candidate = optionalCandidate(req);
    const jobs = await getFeaturedJobs({ candidateId: candidate?.id, location: cleanText(req.query.location, 120), category: cleanText(req.query.category, 120), query: cleanText(req.query.query, 200), visitorKey: cleanText(req.query.visitorKey, 120), limit: req.query.limit });
    res.json(jobs);
  } catch (error) { console.error("Featured recommendations failed:", error.message); res.status(500).json({ error: "Could not load featured jobs." }); }
});
app.post("/api/featured-jobs/:id/event", async (req, res) => {
  try {
    const eventType = ["impression", "click", "apply", "application"].includes(req.body?.type) ? req.body.type : null;
    const placement = cleanText(req.body?.placement, 60);
    const visitorKey = cleanText(req.body?.visitorKey, 120);
    if (!eventType || !placement || !visitorKey) return res.status(400).json({ error: "Invalid featured event." });
    const candidate = optionalCandidate(req);
    const eligible = await db.query("SELECT id FROM jobs WHERE id=$1 AND is_featured=TRUE AND (employer_id IS NULL OR employer_status='Live') AND (featured_start_date IS NULL OR featured_start_date <= NOW()) AND (featured_end_date IS NULL OR featured_end_date > NOW())", [req.params.id]);
    if (!eligible.rows.length) return res.status(404).json({ error: "Featured job not active." });
    const recent = await db.query("SELECT id FROM featured_job_events WHERE job_id=$1 AND event_type=$2 AND placement=$3 AND visitor_key=$4 AND created_at > NOW() - INTERVAL '30 minutes'", [req.params.id, eventType, placement, visitorKey]);
    if (!recent.rows.length) await db.query("INSERT INTO featured_job_events (job_id,event_type,placement,visitor_key,candidate_id) VALUES ($1,$2,$3,$4,$5)", [req.params.id, eventType, placement, visitorKey, candidate?.id || null]);
    res.json({ tracked: !recent.rows.length });
  } catch (error) { res.status(500).json({ error: "Could not track featured event." }); }
});

app.get("/api/jobs/slug/:slug", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM jobs WHERE job_slug = $1 AND (employer_id IS NULL OR employer_status = 'Live')",
      [cleanText(req.params.slug, 200)]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Job not found" });
    const job = result.rows[0];
    res.json({ ...job, applyLink: job.apply_link || null, chatbot_questions: Array.isArray(job.chatbot_questions) ? job.chatbot_questions : JSON.parse(job.chatbot_questions || "[]") });
  } catch (error) {
    console.error("Could not load job by slug:", error.message);
    res.status(500).json({ error: "Could not load job" });
  }
});

app.post("/api/employers/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const user = (await db.query("SELECT * FROM users WHERE email = $1 AND role = 'employer'", [email])).rows[0];
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))) return res.status(401).json({ error: "Invalid employer email or password." });
    if (user.employer_suspended) return res.status(403).json({ error: "This employer account is suspended." });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, userId: user.id, username: user.username });
  } catch { res.status(500).json({ error: "Could not sign in." }); }
});

app.get("/api/employer/profile", verifyToken, isEmployer, async (req, res) => {
  const profile = (await db.query("SELECT * FROM employer_profiles WHERE user_id = $1", [req.user.id])).rows[0];
  res.json(profile || {});
});
app.put("/api/employer/profile", verifyToken, isEmployer, async (req, res) => {
  const fields = ["company_name", "website", "industry", "company_size", "description", "address", "city", "state", "logo_url", "contact_email", "mobile", "company_type"];
  const values = fields.map((key) => cleanText(req.body[key], key === "description" ? 3000 : 300));
  if (values[1] && !/^https:\/\//i.test(values[1])) return res.status(400).json({ error: "Website must start with https://" });
  await db.query(`UPDATE employer_profiles SET (${fields.join(",")}) = (${fields.map((_, index) => `$${index + 1}`).join(",")}), updated_at = NOW() WHERE user_id = $${fields.length + 1}`, [...values, req.user.id]);
  res.json({ message: "Employer profile updated" });
});
app.get("/api/employer/dashboard", verifyToken, isEmployer, async (req, res) => {
  const stats = (await db.query(`SELECT COUNT(*)::int AS total_jobs, COUNT(*) FILTER (WHERE employer_status = 'Live')::int AS live_jobs, COUNT(*) FILTER (WHERE employer_status = 'Pending Review')::int AS pending_jobs, COUNT(*) FILTER (WHERE employer_status IN ('Closed','Expired'))::int AS closed_jobs, COALESCE(SUM(views_count),0)::int AS total_views, COALESCE(SUM(apply_clicks),0)::int AS total_apply_clicks FROM jobs WHERE employer_id = $1`, [req.user.id])).rows[0];
  const jobs = (await db.query("SELECT id, title, location, posted_at, employer_status, views_count, apply_clicks, job_slug, is_featured, featured_start_date, featured_end_date, plan_id FROM jobs WHERE employer_id = $1 ORDER BY posted_at DESC", [req.user.id])).rows;
  const featuredAnalytics = (await db.query(`SELECT COUNT(*) FILTER (WHERE e.event_type='impression')::int AS impressions, COUNT(*) FILTER (WHERE e.event_type='click')::int AS clicks, COUNT(*) FILTER (WHERE e.event_type='apply')::int AS apply_clicks, COUNT(*) FILTER (WHERE e.event_type='application')::int AS applications FROM featured_job_events e JOIN jobs j ON j.id=e.job_id WHERE j.employer_id=$1`, [req.user.id])).rows[0];
  res.json({ stats, jobs, featuredAnalytics });
});
app.get("/api/employer/featured-plans", verifyToken, isEmployer, (req, res) => {
  res.json(Object.values(featuredPlans).map(({ id, name, amount, days }) => ({ id, name, amount: amount / 100, days, currency: "INR" })));
});
app.post("/api/employer/jobs/:id/featured-order", verifyToken, isEmployer, async (req, res) => {
  try {
    const plan = featuredPlans[String(req.body.planId || "")];
    if (!plan) return res.status(400).json({ error: "Choose a valid featured plan." });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ error: "Payments are not configured yet. Please contact MarketLence support." });
    const job = (await db.query("SELECT id, title FROM jobs WHERE id=$1 AND employer_id=$2", [req.params.id, req.user.id])).rows[0];
    if (!job) return res.status(404).json({ error: "Job not found." });
    const payment = (await db.query("INSERT INTO employer_feature_payments (employer_id, job_id, plan_id, amount_paise, duration_days) VALUES ($1,$2,$3,$4,$5) RETURNING *", [req.user.id, job.id, plan.id, plan.amount, plan.days])).rows[0];
    const orderResponse = await axios.post("https://api.razorpay.com/v1/orders", { amount: plan.amount, currency: "INR", receipt: `mlf_${payment.id}`, notes: { payment_id: String(payment.id), employer_id: String(req.user.id), job_id: String(job.id), plan_id: plan.id } }, { auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET }, timeout: 15000 });
    await db.query("UPDATE employer_feature_payments SET razorpay_order_id=$1 WHERE id=$2", [orderResponse.data.id, payment.id]);
    res.status(201).json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: orderResponse.data.id, amount: plan.amount, currency: "INR", plan, job: { id: job.id, title: job.title } });
  } catch (error) {
    console.error("Could not create featured payment order:", error.response?.data || error.message);
    res.status(502).json({ error: "Could not start secure payment. Please try again." });
  }
});
app.post("/api/employer/featured-payment/verify", verifyToken, isEmployer, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Incomplete payment confirmation." });
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!process.env.RAZORPAY_KEY_SECRET || signature.length !== String(razorpay_signature).length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(String(razorpay_signature)))) return res.status(400).json({ error: "Payment verification failed." });
    const payment = (await db.query("SELECT * FROM employer_feature_payments WHERE razorpay_order_id=$1 AND employer_id=$2", [razorpay_order_id, req.user.id])).rows[0];
    if (!payment) return res.status(404).json({ error: "Payment order not found." });
    if (payment.razorpay_payment_id && payment.razorpay_payment_id !== razorpay_payment_id) return res.status(409).json({ error: "This payment order has already been used." });
    await db.query("UPDATE employer_feature_payments SET razorpay_payment_id=$1 WHERE id=$2", [razorpay_payment_id, payment.id]);
    await activateFeaturedJob(payment);
    res.json({ message: `Your job is featured for ${payment.duration_days} days.` });
  } catch (error) { console.error("Featured payment verification failed:", error.message); res.status(500).json({ error: "Could not activate the featured job." }); }
});
app.get("/api/employer/jobs/:id", verifyToken, isEmployer, async (req, res) => {
  const result = await db.query("SELECT * FROM jobs WHERE id=$1 AND employer_id=$2", [req.params.id, req.user.id]);
  if (!result.rows.length) return res.status(404).json({ error: "Job not found" });
  res.json(result.rows[0]);
});
app.post("/api/employer/jobs", verifyToken, isEmployer, employerPostingRateLimit, async (req, res) => {
  try {
    const body = req.body;
    const required = ["title", "city", "state", "description", "applicationMethod"];
    if (required.some((key) => !cleanText(body[key]))) return res.status(400).json({ error: "Complete the required job fields." });
    if (body.applicationMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.applicationValue || ""))) return res.status(400).json({ error: "Enter a valid application email." });
    if (body.applicationMethod === "url" && !/^https:\/\//i.test(String(body.applicationValue || ""))) return res.status(400).json({ error: "Application URL must start with https://" });
    const profile = (await db.query("SELECT company_name FROM employer_profiles WHERE user_id = $1", [req.user.id])).rows[0];
    const result = await db.query(`INSERT INTO jobs (title, company, location, salary, experience, skills, description, type, mode, apply_enabled, apply_link, job_category, country, last_date, employer_id, employer_status, roles_responsibilities, education, openings, application_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,$10,$11,'in',$12,$13,'Pending Review',$14,$15,$16,$17) RETURNING id`, [cleanText(body.title,300), profile?.company_name || cleanText(body.companyName,200), `${cleanText(body.city,120)}, ${cleanText(body.state,120)}`, body.showSalary === false ? "Not disclosed" : `${cleanText(body.minSalary,40)} - ${cleanText(body.maxSalary,40)}`, `${cleanText(body.minExperience,30)} - ${cleanText(body.maxExperience,30)}`, cleanText(body.skills,1000), cleanText(body.description,8000), cleanText(body.jobType,100), cleanText(body.workplaceType,100), cleanText(body.applicationValue,500), cleanText(body.jobCategory,120), cleanText(body.deadline,40), req.user.id, cleanText(body.rolesResponsibilities,8000), cleanText(body.education,500), Number(body.openings) || 1, cleanText(body.applicationMethod,30)]);
    const slug = makeJobSlug(body.title, profile?.company_name || body.companyName, result.rows[0].id);
    await db.query("UPDATE jobs SET job_slug = $1 WHERE id = $2", [slug, result.rows[0].id]);
    employerPostAttempts.set(req.user.id, Date.now());
    res.status(201).json({ message: "Job submitted for review", id: result.rows[0].id, slug });
  } catch (error) { console.error("Employer post job failed:", error.message); res.status(500).json({ error: "Could not submit job." }); }
});
app.patch("/api/employer/jobs/:id/status", verifyToken, isEmployer, async (req, res) => {
  const status = String(req.body.status || "");
  if (!["Paused", "Closed", "Draft"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  await db.query("UPDATE jobs SET employer_status = $1 WHERE id = $2 AND employer_id = $3", [status, req.params.id, req.user.id]);
  res.json({ message: "Job status updated" });
});
app.put("/api/employer/jobs/:id", verifyToken, isEmployer, async (req, res) => {
  try {
    const body = req.body;
    if (!cleanText(body.title, 300) || !cleanText(body.city, 120) || !cleanText(body.state, 120) || !cleanText(body.description, 8000)) return res.status(400).json({ error: "Complete the required job fields." });
    if (body.applicationMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.applicationValue || ""))) return res.status(400).json({ error: "Enter a valid application email." });
    if (body.applicationMethod === "url" && !/^https:\/\//i.test(String(body.applicationValue || ""))) return res.status(400).json({ error: "Application URL must start with https://" });
    const update = await db.query(`UPDATE jobs SET title=$1, location=$2, salary=$3, experience=$4, skills=$5, description=$6, type=$7, mode=$8, apply_link=$9, job_category=$10, last_date=$11, roles_responsibilities=$12, education=$13, openings=$14, application_method=$15, employer_status='Pending Review' WHERE id=$16 AND employer_id=$17 RETURNING id, company`, [cleanText(body.title,300), `${cleanText(body.city,120)}, ${cleanText(body.state,120)}`, body.showSalary === false ? "Not disclosed" : `${cleanText(body.minSalary,40)} - ${cleanText(body.maxSalary,40)}`, `${cleanText(body.minExperience,30)} - ${cleanText(body.maxExperience,30)}`, cleanText(body.skills,1000), cleanText(body.description,8000), cleanText(body.jobType,100), cleanText(body.workplaceType,100), cleanText(body.applicationValue,500), cleanText(body.jobCategory,120), cleanText(body.deadline,40), cleanText(body.rolesResponsibilities,8000), cleanText(body.education,500), Number(body.openings) || 1, cleanText(body.applicationMethod,30), req.params.id, req.user.id]);
    if (!update.rows.length) return res.status(404).json({ error: "Job not found." });
    await db.query("UPDATE jobs SET job_slug=$1 WHERE id=$2", [makeJobSlug(body.title, update.rows[0].company, req.params.id), req.params.id]);
    res.json({ message: "Job updated and returned for review." });
  } catch (error) { console.error("Employer update job failed:", error.message); res.status(500).json({ error: "Could not update job." }); }
});
app.delete("/api/employer/jobs/:id", verifyToken, isEmployer, async (req, res) => { await db.query("DELETE FROM jobs WHERE id = $1 AND employer_id = $2", [req.params.id, req.user.id]); res.json({ message: "Job deleted" }); });
app.post("/api/employer/jobs/:id/track", async (req, res) => {
  const type = req.body?.type === "apply" ? "apply" : "view";
  const key = cleanText(req.body?.visitorKey, 120);
  const recent = await db.query("SELECT id FROM employer_job_events WHERE job_id = $1 AND event_type = $2 AND visitor_key = $3 AND created_at > NOW() - INTERVAL '30 minutes'", [req.params.id, type, key]);
  if (!recent.rows.length) { await db.query("INSERT INTO employer_job_events (job_id,event_type,visitor_key) VALUES ($1,$2,$3)", [req.params.id,type,key]); await db.query(`UPDATE jobs SET ${type === "apply" ? "apply_clicks" : "views_count"} = ${type === "apply" ? "apply_clicks" : "views_count"} + 1 WHERE id = $1`, [req.params.id]); }
  res.json({ tracked: !recent.rows.length });
});

app.get("/api/admin/employers", verifyToken, isAdmin, async (req, res) => {
  const result = await db.query("SELECT u.id, u.email, u.employer_verified, u.employer_suspended, p.full_name, p.company_name, p.city, p.state, p.website, p.created_at, COUNT(j.id)::int AS jobs_count FROM users u JOIN employer_profiles p ON p.user_id=u.id LEFT JOIN jobs j ON j.employer_id=u.id WHERE u.role='employer' GROUP BY u.id, p.user_id ORDER BY p.created_at DESC");
  res.json(result.rows);
});
app.patch("/api/admin/employers/:id", verifyToken, isAdmin, async (req, res) => {
  const verified = req.body.verified === true;
  const suspended = req.body.suspended === true;
  const result = await db.query("UPDATE users SET employer_verified=$1, employer_suspended=$2 WHERE id=$3 AND role='employer' RETURNING id, employer_verified, employer_suspended", [verified, suspended, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: "Employer not found" });
  res.json(result.rows[0]);
});
app.get("/api/admin/employer-jobs", verifyToken, isAdmin, async (req, res) => {
  const result = await db.query("SELECT j.*, p.company_name, u.email AS employer_email FROM jobs j JOIN employer_profiles p ON p.user_id=j.employer_id JOIN users u ON u.id=j.employer_id WHERE j.employer_id IS NOT NULL ORDER BY CASE WHEN j.employer_status='Pending Review' THEN 0 ELSE 1 END, j.posted_at DESC NULLS LAST");
  res.json(result.rows);
});
app.patch("/api/admin/employer-jobs/:id", verifyToken, isAdmin, async (req, res) => {
  const action = String(req.body.action || "");
  const actions = { approve: "Live", reject: "Rejected", close: "Closed", pause: "Paused" };
  if (action === "feature") {
    const days = Math.min(Math.max(Number(req.body.days) || 7, 1), 90);
    const result = await db.query("UPDATE jobs SET is_featured=TRUE, featured_start_date=NOW(), featured_end_date=NOW() + ($1::text || ' days')::interval, promotion_status='featured' WHERE id=$2 AND employer_id IS NOT NULL RETURNING id", [days, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Employer job not found" });
    return res.json({ message: "Job featured" });
  }
  if (action === "priority") {
    const priority = Math.min(Math.max(Number(req.body.priority) || 0, 0), 100);
    const result = await db.query("UPDATE jobs SET promotion_priority=$1 WHERE id=$2 AND employer_id IS NOT NULL RETURNING id", [priority, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Employer job not found" });
    return res.json({ message: "Promotion priority updated" });
  }
  if (!actions[action]) return res.status(400).json({ error: "Invalid moderation action" });
  const result = await db.query("UPDATE jobs SET employer_status=$1 WHERE id=$2 AND employer_id IS NOT NULL RETURNING *", [actions[action], req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: "Employer job not found" });
  if (action === "approve") void queueJobAlertForJob(result.rows[0]);
  res.json({ message: `Job ${actions[action].toLowerCase()}` });
});

function isOfficialIndianGovernmentUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.endsWith(".gov.in") || hostname.endsWith(".nic.in");
  } catch {
    return false;
  }
}

app.get("/api/government-job-agent/sources", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM government_job_sources ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load government job sources" });
  }
});

app.post("/api/government-job-agent/sources", verifyToken, isAdmin, async (req, res) => {
  const { name, url, state = "national" } = req.body;
  if (!name?.trim() || !isOfficialIndianGovernmentUrl(url)) {
    return res.status(400).json({ error: "Use a named official Indian government URL ending in .gov.in or .nic.in" });
  }

  try {
    const result = await db.query(
      "INSERT INTO government_job_sources (name, url, state) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), url.trim(), governmentStateNames.find((item) => item.toLowerCase() === String(state).trim().toLowerCase()) || "national"]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "This source is already added" });
    res.status(500).json({ error: "Could not add government job source" });
  }
});

app.delete("/api/government-job-agent/sources/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM government_job_sources WHERE id = $1", [req.params.id]);
    res.json({ message: "Source removed" });
  } catch (error) {
    res.status(500).json({ error: "Could not remove government job source" });
  }
});

app.get("/api/government-job-agent/drafts", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM government_job_drafts WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load government job drafts" });
  }
});

app.post("/api/government-job-agent/scan", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await scanGovernmentJobSources();
    res.json(result);
  } catch (error) {
    console.log("Government job scan failed:", error);
    res.status(500).json({ error: "Government job scan failed" });
  }
});

app.post("/api/government-job-agent/drafts/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const draftResult = await db.query(
      "SELECT * FROM government_job_drafts WHERE id = $1 AND status = 'pending'",
      [req.params.id]
    );
    const draft = draftResult.rows[0];
    if (!draft) return res.status(404).json({ error: "Pending government job draft not found" });

    const jobResult = await db.query(
      `INSERT INTO jobs
       (title, company, location, salary, experience, skills, description, type, mode, chatbot_questions, apply_enabled, apply_link, job_category, country, last_date, government_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [
        draft.title.slice(0, 300),
        draft.source_name,
        draft.state === "national" ? "India (National)" : draft.state,
        "As per official notification",
        "See official notification",
        "See official notification",
        `Official government recruitment notification found on ${draft.source_name}. Please check eligibility, dates and other details on the official website before applying.`,
        "Government recruitment",
        "As per notification",
        [],
        false,
        draft.apply_link,
        "Government",
        "in",
        "Check official notification",
        draft.state || "national",
      ]
    );

    await db.query(
      "UPDATE government_job_drafts SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [draft.id]
    );
    void sendNewJobNotification({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: draft.state === "national" ? "India" : draft.state });
    void queueJobAlertForJob({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: draft.state === "national" ? "India" : draft.state, salary: "As per official notification", experience: "See official notification", skills: "Government recruitment", description: `Official government recruitment notification from ${draft.source_name}`, type: "Government recruitment", mode: "Onsite", job_category: "Government" });
    void postApprovedJobToFacebook({
      id: jobResult.rows[0].id,
      title: draft.title,
      company: draft.source_name,
      location: draft.state === "national" ? "India" : draft.state,
      salary: "As per official notification",
      lastDate: "Check official notification",
    });
    res.json({ message: "Government job published", jobId: jobResult.rows[0].id });
  } catch (error) {
    const message = error?.message || "Unknown database error";
    console.log("Could not approve government job draft:", message, error?.detail || "");
    res.status(500).json({ error: `Could not publish government job: ${message}` });
  }
});

app.post("/api/government-job-agent/drafts/:id/dismiss", verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE government_job_drafts SET status = 'dismissed', reviewed_at = NOW() WHERE id = $1 AND status = 'pending'",
      [req.params.id]
    );
    res.json({ message: "Government job draft dismissed" });
  } catch (error) {
    res.status(500).json({ error: "Could not dismiss government job draft" });
  }
});

app.get("/api/company-job-agent/sources", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM company_job_sources ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load company job sources" });
  }
});

app.post("/api/company-job-agent/sources", verifyToken, isAdmin, async (req, res) => {
  const { name, url, jobCategory = "Private", country } = req.body;
  if (!name?.trim() || !isSafeCompanySourceUrl(url)) {
    return res.status(400).json({ error: "Use a verified HTTPS company careers URL" });
  }
  const category = jobCategory === "Government" ? "Government" : "Private";
  const sourceCountry = /^[a-z]{2}$/i.test(String(country || "")) ? String(country).toLowerCase() : inferSourceCountry(name, url);

  try {
    const result = await db.query(
      "INSERT INTO company_job_sources (name, url, job_category, country) VALUES ($1, $2, $3, $4) RETURNING *",
      [name.trim(), url.trim(), category, sourceCountry]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "This source is already added" });
    res.status(500).json({ error: "Could not add company job source" });
  }
});

app.delete("/api/company-job-agent/sources/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM company_job_sources WHERE id = $1", [req.params.id]);
    res.json({ message: "Source removed" });
  } catch (error) {
    res.status(500).json({ error: "Could not remove company job source" });
  }
});

app.patch("/api/company-job-agent/sources/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const enabled = req.body?.enabled === true;
    const result = await db.query(
      "UPDATE company_job_sources SET enabled=$1, scan_failure_count=CASE WHEN $1 THEN 0 ELSE scan_failure_count END, last_scan_error=CASE WHEN $1 THEN NULL ELSE last_scan_error END WHERE id=$2 RETURNING *",
      [enabled, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Source not found" });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Could not update company source" }); }
});

app.get("/api/company-job-agent/drafts", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM company_job_drafts WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not load company job drafts" });
  }
});

app.post("/api/company-job-agent/scan", verifyToken, isAdmin, async (req, res) => {
  if (companyJobScanRunning) {
    return res.status(202).json({ started: false, message: "A company job scan is already running" });
  }

  // Do not keep the browser request open while hundreds of sources are read.
  // Railway can otherwise end the request before the scan has finished.
  scanCompanyJobSources().catch((error) => console.log("Company job scan failed:", error.message));
  res.status(202).json({ started: true, message: "Company job scan started in the background" });
});

app.post("/api/company-job-agent/drafts/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const draftResult = await db.query(
      "SELECT * FROM company_job_drafts WHERE id = $1 AND status = 'pending'",
      [req.params.id]
    );
    const draft = draftResult.rows[0];
    if (!draft) return res.status(404).json({ error: "Pending company job draft not found" });

    const jobResult = await db.query(
      `INSERT INTO jobs
       (title, company, location, salary, experience, skills, description, type, mode, chatbot_questions, apply_enabled, apply_link, job_category, country, last_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        draft.title.slice(0, 300),
        draft.source_name,
        "See company careers page",
        "Not disclosed",
        "See company careers page",
        "See company careers page",
        `Opening collected from the official ${draft.source_name} careers page. Check the official job page for eligibility, responsibilities and deadlines.`,
        "Company recruitment",
        draft.visa_sponsorship ? "Visa" : "As per company posting",
        [],
        false,
        draft.apply_link,
        draft.job_category === "Government" ? "Government" : "Private",
        draft.country || inferSourceCountry(draft.source_name, draft.source_url),
        "Check company careers page",
      ]
    );
    await db.query(
      "UPDATE company_job_drafts SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [draft.id]
    );
    void sendNewJobNotification({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: "See company careers page" });
    void queueJobAlertForJob({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: "See company careers page", salary: "Not disclosed", experience: "See company careers page", skills: "", description: "Opening from official company careers page", type: "Full-time", mode: "Onsite", job_category: draft.job_category });
    void postApprovedJobToFacebook({
      id: jobResult.rows[0].id,
      title: draft.title,
      company: draft.source_name,
      location: "See company careers page",
      salary: "Not disclosed",
      lastDate: "Check company careers page",
    });
    res.json({ message: "Company job published", jobId: jobResult.rows[0].id });
  } catch (error) {
    const message = error?.message || "Unknown database error";
    console.log("Could not approve company job draft:", message, error?.detail || "");
    res.status(500).json({ error: `Could not publish company job: ${message}` });
  }
});

app.post("/api/company-job-agent/drafts/:id/dismiss", verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE company_job_drafts SET status = 'dismissed', reviewed_at = NOW() WHERE id = $1 AND status = 'pending'",
      [req.params.id]
    );
    res.json({ message: "Company job draft dismissed" });
  } catch (error) {
    res.status(500).json({ error: "Could not dismiss company job draft" });
  }
});

app.get("/api/visa-job-agent/sources", verifyToken, isAdmin, async (req, res) => {
  try { res.json((await db.query("SELECT * FROM visa_job_sources ORDER BY country, name")).rows); }
  catch { res.status(500).json({ error: "Could not load visa job resources" }); }
});
app.get("/api/visa-job-agent/drafts", verifyToken, isAdmin, async (req, res) => {
  try { res.json((await db.query("SELECT * FROM visa_job_drafts WHERE status = 'pending' ORDER BY created_at DESC")).rows); }
  catch { res.status(500).json({ error: "Could not load sponsored job drafts" }); }
});
app.post("/api/visa-job-agent/scan", verifyToken, isAdmin, (req, res) => {
  if (visaJobScanRunning) return res.status(202).json({ started: false, message: "A visa sponsorship scan is already running" });
  scanVisaJobSources().catch((error) => console.log("Visa sponsorship scan failed:", error.message));
  res.status(202).json({ started: true, message: "Visa sponsorship scan started in the background" });
});
app.post("/api/visa-job-agent/drafts/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const draft = (await db.query("SELECT * FROM visa_job_drafts WHERE id = $1 AND status = 'pending'", [req.params.id])).rows[0];
    if (!draft) return res.status(404).json({ error: "Pending sponsored job draft not found" });
    const result = await db.query(`INSERT INTO jobs
      (title, company, location, salary, experience, skills, description, type, mode, chatbot_questions, apply_enabled, apply_link, job_category, country, last_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`, [
      draft.title.slice(0, 300), draft.source_name, "See official job listing", "Not disclosed", "See official job listing", "See official job listing",
      `Visa sponsorship opening collected from ${draft.source_name}. Please confirm eligibility and visa support on the official listing before applying.`,
      "Company recruitment", "Visa", [], false, draft.apply_link, "Private", draft.country || "global", "Check official job listing"
    ]);
    await db.query("UPDATE visa_job_drafts SET status = 'approved', reviewed_at = NOW() WHERE id = $1", [draft.id]);
    void sendNewJobNotification({ id: result.rows[0].id, title: draft.title, company: draft.source_name, location: "Visa sponsorship" });
    void postApprovedJobToFacebook({ id: result.rows[0].id, title: draft.title, company: draft.source_name, location: "Visa sponsorship", salary: "Not disclosed", lastDate: "Check official job listing" });
    res.json({ message: "Visa sponsorship job published", jobId: result.rows[0].id });
  } catch (error) { res.status(500).json({ error: `Could not publish sponsored job: ${error.message}` }); }
});
app.post("/api/visa-job-agent/drafts/:id/dismiss", verifyToken, isAdmin, async (req, res) => {
  try { await db.query("UPDATE visa_job_drafts SET status = 'dismissed', reviewed_at = NOW() WHERE id = $1 AND status = 'pending'", [req.params.id]); res.json({ message: "Opening dismissed" }); }
  catch { res.status(500).json({ error: "Could not dismiss sponsored opening" }); }
});

// Admin-only directory of registered job seekers. Passwords and other
// sensitive account fields are deliberately never returned.
app.get("/api/admin/candidates", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        username,
        email,
        bio,
        skills,
        education,
        experience,
        projects,
        profile_pic,
        resume_url
      FROM users
      WHERE role = 'user'
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.log("CANDIDATE DIRECTORY ERROR:", err);
    res.status(500).json({ error: "Unable to fetch candidates" });
  }
});

app.get("/api/admin-requests", verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE role = 'admin' AND is_approved = false"
    );

    res.json(result.rows);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching admin requests");
  }
});


app.post("/api/apply", verifyToken, upload.single("resume"), async (req, res) => {

  try {
    if (req.user.role !== "user") return res.status(403).json({ error: "Please use a candidate account to apply." });

    const name = cleanText(req.user.username, 120);
    const email = String(req.user.email || "").toLowerCase().trim();
    const jobId = parseInt(req.body.jobId);

    if (!jobId) return res.status(400).json({ error: "Job ID is missing." });
    if (!req.file || (req.file.mimetype !== "application/pdf" && !String(req.file.originalname || "").toLowerCase().endsWith(".pdf"))) return res.status(400).json({ error: "Please upload your resume as a PDF." });

    const resume = req.file ? req.file.path : null;

    const job = await db.query("SELECT id, title, company, apply_enabled, apply_link, employer_id, employer_status FROM jobs WHERE id=$1", [jobId]);
    if (!job.rows.length || job.rows[0].apply_enabled === false || job.rows[0].apply_link || (job.rows[0].employer_id && job.rows[0].employer_status !== "Live")) {
      return res.status(400).json({ error: "This job is not accepting applications on Marketlence Jobs." });
    }

    const previous = await db.query("SELECT id FROM applications WHERE jobid=$1 AND (candidate_user_id=$2 OR (candidate_user_id IS NULL AND email=$3)) AND status <> 'Withdrawn' LIMIT 1", [jobId, req.user.id, email]);
    if (previous.rows.length) return res.status(409).json({ error: "You have already applied for this job." });

    const result = await db.query(
      `INSERT INTO applications (name, email, jobid, resume, candidate_user_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'Applied', NOW(), NOW())
       RETURNING id`,
      [name, email, jobId, resume, req.user.id]
    );

    const applicationId = result.rows[0].id;
    await db.query("INSERT INTO application_status_history (application_id, status, note, changed_by_user_id) VALUES ($1, 'Applied', 'Application submitted', $2)", [applicationId, req.user.id]);

    // Attribute a completed application to an active featured placement without
    // storing the applicant's email in the analytics event.
    const featuredJob = await db.query("SELECT id FROM jobs WHERE id=$1 AND is_featured=TRUE AND (employer_id IS NULL OR employer_status='Live') AND (featured_end_date IS NULL OR featured_end_date > NOW())", [jobId]);
    if (featuredJob.rows.length) {
      const anonymousKey = crypto.createHash("sha256").update(String(email || applicationId)).digest("hex").slice(0, 32);
      await db.query("INSERT INTO featured_job_events (job_id,event_type,placement,visitor_key) VALUES ($1,'application','apply-form',$2)", [jobId, anonymousKey]);
    }

    console.log("Application saved:", applicationId);

    // ✅ SEND RESPONSE IMMEDIATELY (FAST ⚡)
    res.json({
      message: "Application saved ✅",
      applicationId
    });

    // 🔥 RUN EMAIL IN BACKGROUND (NO WAIT)
   (async () => {
  try {
    await resend.emails.send({
      from: "Marketlence <onboarding@resend.dev>",
      to: email,
      subject: "Application Submitted Successfully ✅",
      html: `
        <h2>Application Received ✅</h2>
        <p>Hello ${name},</p>
        <p>Your application for <b>${cleanText(job.rows[0].title, 300)}</b> at <b>${cleanText(job.rows[0].company, 200)}</b> has been submitted successfully.</p>
        <p>You can follow its progress from your Marketlence Jobs dashboard.</p>
        <br/>
        <p>Marketlence Team</p>
      `
    });
  } catch (err) {
    console.log("RESEND ERROR:", err);
  }
})();

  } catch (err) {
    console.log("APPLY ERROR:", err);
    res.status(500).json({ error: "Application failed" });
  }
});

app.delete("/api/applications/:id", verifyToken, async (req, res) => {
 const id = parseInt(req.params.id);

  try {
    const application = await db.query("SELECT id, candidate_user_id, email, status FROM applications WHERE id=$1", [id]);
    if (!application.rows.length) return res.status(404).json({ error: "Application not found." });
    const isAdminUser = ["admin", "superadmin"].includes(req.user.role);
    const isOwner = application.rows[0].candidate_user_id === req.user.id || (!application.rows[0].candidate_user_id && application.rows[0].email === req.user.email);
    if (!isAdminUser && !isOwner) return res.status(403).json({ error: "You cannot change this application." });

    if (isAdminUser) {
      await db.query("DELETE FROM applications WHERE id=$1", [id]);
      return res.json({ message: "Application deleted." });
    }

    if (application.rows[0].status === "Withdrawn") return res.status(400).json({ error: "This application is already withdrawn." });
    await db.query("UPDATE applications SET status='Withdrawn', updated_at=NOW() WHERE id=$1", [id]);
    await db.query("INSERT INTO application_status_history (application_id, status, note, changed_by_user_id) VALUES ($1, 'Withdrawn', 'Withdrawn by candidate', $2)", [id, req.user.id]);
    res.json({ message: "Application withdrawn.", status: "Withdrawn" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting application");
  }
});

app.post("/api/save-job", async (req, res) => {
  const {
    user_id,
    job_id,
    external_job_id,
    source,
    title,
    company,
    location
  } = req.body;

  try {
    await db.query(
  `
  INSERT INTO saved_jobs
  (
    user_id,
    job_id,
    external_job_id,
    source,
    title,
    company,
    location
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  `,
  [
    user_id,
    job_id || null,
    external_job_id || null,
    source || "internal",
    title || null,
    company || null,
    location || null
  ]
);

    res.send("Job saved ✅");
  } catch (err) {
    console.log("SAVE JOB ERROR:", err);
    res.status(500).send("Error saving job");
  }
});

app.get("/api/saved-jobs/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await db.query(
      `
      SELECT *
      FROM saved_jobs
      WHERE user_id = $1
      ORDER BY id DESC
      `,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching saved jobs");
  }
});

app.delete("/api/unsave-job", async (req, res) => {
  try {
    const {
      user_id,
      job_id,
      external_job_id
    } = req.body;

    if (external_job_id) {
      await db.query(
        `
        DELETE FROM saved_jobs
        WHERE user_id = $1
        AND external_job_id = $2
        `,
        [user_id, external_job_id]
      );
    } else {
      await db.query(
        `
        DELETE FROM saved_jobs
        WHERE user_id = $1
        AND job_id = $2
        `,
        [user_id, job_id]
      );
    }

    res.send("Job removed from saved ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error removing saved job");
  }
});

app.put("/api/applications/:id", verifyToken, isAdmin, async (req, res) => {
  const { status, note } = req.body;
  const id = req.params.id;

  try {
    if (!applicationStatuses.includes(status)) return res.status(400).json({ error: "Choose a valid application status." });
    const updated = await db.query(
      `UPDATE applications SET status=$1, status_note=$2, updated_at=NOW() WHERE id=$3
       RETURNING id, name, email, jobid, status, status_note`,
      [status, cleanText(note, 1000) || null, id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: "Application not found." });
    const application = updated.rows[0];
    await db.query("INSERT INTO application_status_history (application_id, status, note, changed_by_user_id) VALUES ($1,$2,$3,$4)", [application.id, status, application.status_note, req.user.id]);
    res.json({ message: "Status updated.", application });

    (async () => {
      try {
        const job = await db.query("SELECT title, company FROM jobs WHERE id=$1", [application.jobid]);
        const title = job.rows[0]?.title || "your application";
        const company = job.rows[0]?.company || "the employer";
        await resend.emails.send({ from: "Marketlence Jobs <care@marketlence.com>", to: application.email, subject: `Application update: ${title}`, html: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Application update</h2><p>Hello ${cleanText(application.name, 120) || "there"},</p><p>Your application for <b>${cleanText(title, 300)}</b> at <b>${cleanText(company, 200)}</b> is now: <b>${status}</b>.</p>${application.status_note ? `<p><b>Note:</b> ${cleanText(application.status_note, 1000)}</p>` : ""}<p>Sign in to Marketlence Jobs to view your application tracker.</p></div>` });
      } catch (error) { console.error("Application status email failed:", error.message); }
    })();
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating status");
  }
});


app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const cleanEmail = email.toLowerCase().trim();

const user = await db.query(
  "SELECT * FROM users WHERE LOWER(email) = $1",
  [cleanEmail]
);

    if (user.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email"
      });
    }
      console.log("USER FROM DB:", user.rows[0]); // ✅ ADD HERE

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid password"
      });
    }

    if (
  (user.rows[0].role === "admin" ||
   user.rows[0].role === "superadmin") &&
  !user.rows[0].is_approved
) {
  return res.status(403).json({
    error: "Approval pending ⏳"
  });
}

    const token = jwt.sign(
  {
    id: user.rows[0].id,
    email: user.rows[0].email,
    role: user.rows[0].role   // ✅ ADD THIS
  },
   process.env.JWT_SECRET
);

    res.json({
  token,
  role: user.rows[0].role,
  userId: user.rows[0].id,
 username: user.rows[0].username  // ✅ ADD THIS
});

  } catch (err) {
    console.log(err);
    res.status(500).send("Login error");
  }
});
app.put("/api/jobs/:id", verifyToken, isAdmin, async (req, res) => {
  const id = req.params.id;
  const {
    title,
    company,
    location,
    salary,
    experience,
    skills,
    description,
    type,
    mode,
    applyEnabled = true,
    applyLink = null,
    jobCategory = null,
    lastDate = null,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE jobs
       SET title = $1, company = $2, location = $3, salary = $4,
           experience = $5, skills = $6, description = $7, type = $8,
           mode = $9, apply_enabled = $10, apply_link = $11, job_category = $12, last_date = $13
       WHERE id = $14
       RETURNING *`,
      [
        title,
        company,
        location,
        salary,
        experience,
        skills,
        description,
        type,
        mode,
        applyEnabled !== false,
        applyLink?.trim() || null,
        ["Private", "Government"].includes(jobCategory) ? jobCategory : null,
        lastDate?.trim() || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ message: "Job updated successfully", job: result.rows[0] });
  } catch (err) {
    console.log("Could not update job:", err);
    res.status(500).json({ error: "Could not update job" });
  }
});

app.delete("/api/jobs/:id", verifyToken, isAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    await db.query(
      "DELETE FROM jobs WHERE id = $1",
      [id]
    );

    res.send("Job deleted ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting job");
  }
});
const PORT = process.env.PORT || 5000;

app.post(
  "/api/upload-resume",
  upload.single("resume"),
  (req, res) => {

    console.log("RESUME FILE:", req.file);

    res.json({
      message: "Resume uploaded ✅",
      file: req.file.path || req.file.secure_url
    });
  }
);

app.post("/api/upload-image", upload.single("image"), (req, res) => {
  console.log("FILE FULL:", req.file); // 👈 add this

  res.json({
    message: "Image uploaded ✅",
    file: req.file.path // ✅ ADD THIS LINE
  });
});


app.get("/api/shortlist/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT a.* FROM applications a
       JOIN shortlisted s ON a.id = s.application_id
       WHERE s.user_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.delete("/api/shortlist/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query(
      "DELETE FROM shortlisted WHERE application_id = $1",
      [id]
    );

    res.send("Removed ❌");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.get("/api/dashboard-stats/:userId", verifyToken, async (req, res) => {

  // ✅ correct way
 const userId = req.user.id;
  const userEmail = req.user.email;

  console.log("USER ID:", userId);
  console.log("TYPE:", typeof userId);

  try {
    const savedJobs = await db.query(
      "SELECT COUNT(*) FROM saved_jobs WHERE user_id = $1",
      [userId]
    );

    const applications = await db.query(
  "SELECT COUNT(*) FROM applications WHERE email = $1",
  [req.user.email]
);

    res.json({
      saved: savedJobs.rows[0].count,
      applied: applications.rows[0].count
    });

  } catch (err) {
    console.log("DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Dashboard error ❌" });
  }
});


app.get("/api/recent-applications", verifyToken, isAdmin, async (req, res) => {

  try {

    const result = await db.query(`
  SELECT
    applications.id,
    applications.name,
    applications.status,
    COALESCE(jobs.title, 'No Title') AS title,
    COALESCE(jobs.company, 'Unknown') AS company
  FROM applications
  LEFT JOIN jobs
  ON applications.jobid = jobs.id
  ORDER BY applications.id DESC
  LIMIT 5
`);

    res.json(result.rows);

  } catch (err) {

    console.log(err);

    res.status(500).send("Error fetching applications");

  }
});

app.get("/api/fix-jobs", async (req, res) => {

  try {

    await db.query(`
      UPDATE jobs
      SET
        description = 'Build modern React applications.',
        salary = '12 LPA',
        experience = '2 Years',
        skills = 'React, Tailwind',
        mode = 'Remote'
      WHERE id = 1
    `);

    await db.query(`
      UPDATE jobs
      SET
        description = 'Analyze business data and generate insights.',
        salary = '10 LPA',
        experience = '1 Year',
        skills = 'Python, SQL, Power BI',
        mode = 'Hybrid'
      WHERE id = 2
    `);

    res.send("Jobs updated ✅");

  } catch (err) {

    console.log(err);

    res.status(500).send("Error updating jobs");

  }

});

app.get("/api/applications/check", async (req, res) => {
  const { jobId, email } = req.query;
  try {
    const result = await db.query(
      "SELECT * FROM applications WHERE jobid = $1 AND email = $2",
      [jobId, email]
    );

    res.json({ applied: result.rows.length > 0 });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error checking application");
  }
});

app.delete(
  "/api/applications",
  verifyToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      await db.query("DELETE FROM applications");
      res.send("All deleted");
    } catch (err) {
      res.status(500).send("Error");
    }
  }
);

app.post("/api/chatbot-response", async (req, res) => {
  const { applicationId, question, answer } = req.body;

  try {
   console.log("Request received");

    const appId = parseInt(applicationId);

    if (!appId || !question || !answer) {
      return res.status(400).send("Invalid data ❌");
    }

    await db.query(
      `
      INSERT INTO chatbot_responses (application_id, question, answer)
      VALUES ($1, $2, $3)
      `,
      [appId, question, answer]
    );

    res.send("Saved ✅");

  } catch (err) {
    console.log("CHATBOT ERROR:", err.message);
    res.status(500).send("Error");
  }
});


app.get("/api/chatbot-response/:id", async (req, res) => {
  console.log("Fetching chatbot for ID:", req.params.id); // 👈 ADD
  try {

    const appId = parseInt(req.params.id)
    
    const result = await db.query(
  "SELECT * FROM chatbot_responses WHERE application_id = $1",
  [appId]
    );

      console.log("DB RESULT:", result.rows); // 👈 ADD

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.post(
  "/api/resume-match",
  upload.single("resume"),
  async (req, res) => {

    try {

      const { jobSkills } = req.body; // ✅ ADD THIS

      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      if (req.file.size > 2 * 1024 * 1024) {
  return res.status(400).send("File too large");
}

      const fileUrl =
        req.file.secure_url ||
        req.file.path;

      const publicUrl = fileUrl.replace(
        "/upload/",
        "/upload/fl_attachment/"
      );

      const response = await axios.get(
        publicUrl,
        { responseType: "arraybuffer" }
      );

      console.log("PDF DOWNLOADED");

      const pdfData = await pdfParse(
        Buffer.from(response.data)
      );

      console.log("PDF PARSED");

      const resumeText =
        pdfData.text.toLowerCase();

      const skillsArray =
        (jobSkills || "")
          .toLowerCase()
          .split(",");

      let matchedSkills = 0;

      skillsArray.forEach((skill) => {
        if (resumeText.includes(skill.trim())) {
          matchedSkills++;
        }
      });

      const score = Math.round(
        (matchedSkills / skillsArray.length) * 100
      );

      res.json({ score });

    } catch (err) {
      console.log("RESUME MATCH ERROR:", err);
      res.status(500).send("Match failed");
    }

  }
);

app.post("/api/shortlist", async (req, res) => {
  const { applicationId, userId } = req.body;

  try {
    await db.query(
      "INSERT INTO shortlisted (application_id, user_id) VALUES ($1, $2)",
      [applicationId, userId]
    );

    res.send("Added to shortlist ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});


app.get("/api/applications/:id/history", verifyToken, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const application = await db.query("SELECT id, candidate_user_id, email FROM applications WHERE id=$1", [id]);
    if (!application.rows.length) return res.status(404).json({ error: "Application not found." });
    const isAdminUser = ["admin", "superadmin"].includes(req.user.role);
    const isOwner = application.rows[0].candidate_user_id === req.user.id || (!application.rows[0].candidate_user_id && application.rows[0].email === req.user.email);
    if (!isAdminUser && !isOwner) return res.status(403).json({ error: "You cannot view this application." });
    const history = await db.query("SELECT status, note, created_at FROM application_status_history WHERE application_id=$1 ORDER BY created_at ASC", [id]);
    res.json(history.rows);
  } catch (err) { console.error("Application history error:", err); res.status(500).json({ error: "Could not load application history." }); }
});

app.get("/api/applications/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.query(
      "SELECT * FROM applications WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    const application = result.rows[0];
    const isAdminUser = ["admin", "superadmin"].includes(req.user.role);
    const isOwner = application.candidate_user_id === req.user.id || (!application.candidate_user_id && application.email === req.user.email);
    if (!isAdminUser && !isOwner) return res.status(403).json({ error: "You cannot view this application." });
    res.json(application);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching application");
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await db.query(
      "SELECT * FROM jobs WHERE id = $1 AND (employer_id IS NULL OR employer_status = 'Live')",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Job not found ❌");
    }

    const job = result.rows[0];

    let questions = [];

        // 🔥 SAFE PARSE
    try {
      if (typeof job.chatbot_questions === "string") {
        questions = JSON.parse(job.chatbot_questions);
      } else if (Array.isArray(job.chatbot_questions)) {
        questions = job.chatbot_questions;
      } else {
        questions = [];
      }
    } catch (err) {
      console.log("PARSE ERROR:", err);
      questions = [];
    }

    res.json({
      ...job,
      chatbot_questions: questions
    });

  } catch (err) {
    console.log("GET JOB ERROR:", err);
    res.status(500).send("Error fetching job");
  }
});


app.post("/api/send-email-otp", async (req, res) => {
  const { email } = req.body;

  const cleanEmail = email.toLowerCase().trim();

  // 🚫 RATE LIMIT CHECK
  if (
    lastRequest[cleanEmail] &&
    Date.now() - lastRequest[cleanEmail] < 60000
  ) {
    return res.status(429).json({
      error: "Wait before requesting again ⏳"
    });
  }

  // ✅ SAVE REQUEST TIME
  lastRequest[cleanEmail] = Date.now();

  const otp = Math.floor(100000 + Math.random() * 900000);

    try {
    await resend.emails.send({
      from: "Marketlence <care@marketlence.com>",
      to: cleanEmail,
      subject: "Your OTP Code 🔐",
      html: `<h2>Your OTP is: ${otp}</h2>
             <p>This OTP is valid for 5 minutes.</p>`
    });

    await db.query(
  "INSERT INTO otps (email, otp, expires) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET otp=$2, expires=$3",
  [cleanEmail, otp, Date.now() + 5 * 60 * 1000]
);

   
    res.json({ message: "OTP sent ✅" });

  } catch (err) {
    console.log("RESEND ERROR:", err);
    res.status(500).send("Failed to send OTP ❌");
  }
});

app.post("/api/verify-email-otp", async (req, res) => {
  const { username, email, password, otp, isAdmin, jobAlertsEnabled = false } = req.body;

  const cleanEmail = email.toLowerCase().trim();
  const result = await db.query(
  "SELECT * FROM otps WHERE email = $1",
  [cleanEmail]
);

const record = result.rows[0];


console.log("EMAIL:", cleanEmail);
console.log("STORED:", record);
console.log("ENTERED OTP:", otp);
console.log("COMPARE:", String(record.otp), String(otp));

  let role = "user";
  let isApproved = true;

  if (isAdmin) {
    role = "admin";
    isApproved = false;
  }

  if (!record) {
    return res.status(400).json({ error: "OTP not found ❌" });
  }

  if (Date.now() > Number(record.expires)) {
    return res.status(400).json({ error: "OTP expired ⏳" });
  }

  if (String(record.otp) !== String(otp)) {
    return res.status(400).json({ error: "Invalid OTP ❌" });
  }

  try {
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists ❌" });
    }

   
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await db.query(
      "INSERT INTO users (username, email, password, role, is_approved) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [username, cleanEmail, hashedPassword, role, isApproved]
    );
    if (role === "user") await db.query("INSERT INTO candidate_job_alert_preferences (candidate_id,email_enabled,consent_at,consent_source) VALUES ($1,$2,CASE WHEN $2 THEN NOW() ELSE NULL END,$3) ON CONFLICT (candidate_id) DO NOTHING", [createdUser.rows[0].id, Boolean(jobAlertsEnabled), jobAlertsEnabled ? "signup" : null]);

   await db.query("DELETE FROM otps WHERE email = $1", [cleanEmail]);

    res.json({ message: "Signup successful ✅" });

  } catch (err) {
    console.log(err);
    res.status(500).send("Signup error");
  }
});

app.put("/api/approve-admin/:id", verifyToken, isSuperAdmin, async (req, res) => {
  const id = req.params.id;

  await db.query(
    "UPDATE users SET is_approved = true WHERE id = $1",
    [id]
  );

  res.send("Approved ✅");
});

app.delete("/api/reject-admin/:id", verifyToken, isSuperAdmin, async (req, res) => {
  const id = req.params.id;

  await db.query(
    "DELETE FROM users WHERE id = $1",
    [id]
  );

  res.send("Rejected ❌");
});

app.post("/api/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const cleanEmail = email.toLowerCase().trim();

  try {
    const result = await db.query(
      "SELECT * FROM otps WHERE email = $1",
      [cleanEmail]
    );

    const record = result.rows[0];

    if (!record) {
      return res.status(400).json({ error: "OTP not found ❌" });
    }

    if (Date.now() > Number(record.expires)) {
      return res.status(400).json({ error: "OTP expired ⏳" });
    }

    if (String(record.otp) !== String(otp)) {
      return res.status(400).json({ error: "Invalid OTP ❌" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const userCheck = await db.query(
  "SELECT * FROM users WHERE email = $1",
  [cleanEmail]
);

if (userCheck.rows.length === 0) {
  return res.status(400).json({ error: "User not found ❌" });
}

    await db.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [hashedPassword, cleanEmail]
    );

    await db.query("DELETE FROM otps WHERE email = $1", [cleanEmail]);

    res.json({ message: "Password reset successful ✅" });

  } catch (err) {
    console.log(err);
    res.status(500).send("Reset failed");
  }
});

app.get("/api/applications", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        applications.*,
        COALESCE(jobs.title, 'Deleted Job') AS title,
        COALESCE(jobs.company, 'Unknown Company') AS company,
        COALESCE(applications.created_at, NOW()) AS created_at,
        COALESCE(applications.updated_at, applications.created_at, NOW()) AS updated_at
      FROM applications
      LEFT JOIN jobs
      ON applications.jobid = jobs.id
      WHERE applications.candidate_user_id = $1 OR (applications.candidate_user_id IS NULL AND applications.email = $2)
      ORDER BY applications.updated_at DESC NULLS LAST, applications.id DESC
      `,
      [req.user.id, req.user.email]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching applications");
  }
});

app.post(
  "/api/extract-resume",
  upload.single("resume"),
  async (req, res) => {
    try {
      const fileUrl = req.file.path;

      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer"
      });

      const pdfData = await pdfParse(
        Buffer.from(response.data)
      );

      const text = pdfData.text;

      const completion =
  await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Extract resume information and return ONLY valid JSON.

{
  "skills": [],
  "education": "",
  "experience": "",
  "projects": []
}
`
      },
      {
        role: "user",
        content: text
      }
    ]
  });

const extracted = JSON.parse(
  completion.choices[0].message.content
);

res.json({
  ...extracted,
  text
});

    } catch (err) {
      console.log(err);
      res.status(500).send("Extraction failed");
    }
  }
);

app.get("/api/recommended-jobs/:skills", async (req, res) => {
  const skills = req.params.skills.toLowerCase();

  try {
    const result = await db.query(
      "SELECT * FROM jobs"
    );

    const jobs = result.rows.filter(job =>
      job.skills?.toLowerCase().includes(
        skills.split(",")[0].trim()
      )
    );

    res.json(jobs);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.put("/api/profile", async (req, res) => {
  try {
    const {
      userId,
      bio,
      skills,
      education,
      experience,
      projects,
      profilePic,
      resume
    } = req.body;

    await db.query(
      `
      UPDATE users
      SET
        bio = $1,
        skills = $2,
        education = $3,
        experience = $4,
        projects = $5,
        profile_pic = $6,
        resume_url = $7
      WHERE id = $8
      `,
      [
        bio,
        skills,
        education,
        experience,
        projects,
        profilePic,
        resume,
        userId
      ]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/profile/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

const adzunaCountries = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"]);

app.get("/api/external-jobs", async (req, res) => {
  try {
    console.log("APP_ID:", process.env.ADZUNA_APP_ID);
    console.log("APP_KEY EXISTS:", !!process.env.ADZUNA_APP_KEY);

   const {
  query = "",
  location = "",
  country = "in",
} = req.query;

    // Adzuna only publishes job feeds for these markets. Other countries can
    // still show internal jobs and global sources without triggering a 500 error.
    if (!adzunaCountries.has(String(country).toLowerCase())) {
      return res.json([]);
    }

    const response = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_APP_KEY,
          what: query,
          where: location,
          results_per_page: 20,
        },
      }
    );

    res.json(response.data.results);
  } catch (err) {
    console.log("STATUS:", err.response?.status);
    console.log("DATA:", err.response?.data);
    console.log("MESSAGE:", err.message);

    res.status(500).json({ error: err.message });
  }
});

app.post("/api/google-login", async (req, res) => {
  try {
    const { credential, accountType, employerProfile = {} } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email.toLowerCase().trim();
    const name = payload.name;

    // Check if user exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (accountType === "employer") {
      if (existingUser.rows.length && existingUser.rows[0].role !== "employer") {
        return res.status(409).json({ error: "This Google email is already registered as a candidate. Use a different work email for your employer account." });
      }
      if (!existingUser.rows.length) {
        const { fullName, mobile, companyName, website, companyType, industry, companySize, city, state } = employerProfile;
        if (!cleanText(fullName, 120) || !cleanText(companyName, 200) || !cleanText(mobile, 30) || !cleanText(city, 120) || !cleanText(state, 120)) {
          return res.status(400).json({ error: "Complete the employer and company details before using Google." });
        }
        if (website && !/^https:\/\//i.test(String(website))) return res.status(400).json({ error: "Company website must start with https://" });
        const newEmployer = await db.query(
          "INSERT INTO users (username, email, password, role, is_approved, employer_verified, employer_email_verified, employer_email_verified_at) VALUES ($1,$2,$3,'employer',TRUE,TRUE,TRUE,NOW()) RETURNING *",
          [cleanText(fullName, 120), email, "google-auth-employer",]
        );
        user = newEmployer.rows[0];
        await db.query("INSERT INTO employer_profiles (user_id, full_name, mobile, company_name, website, company_type, industry, company_size, city, state, contact_email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [user.id, cleanText(fullName,120), cleanText(mobile,30), cleanText(companyName,200), cleanText(website,300), cleanText(companyType,100), cleanText(industry,120), cleanText(companySize,80), cleanText(city,120), cleanText(state,120), email]);
      } else {
        user = existingUser.rows[0];
        if (user.employer_suspended) return res.status(403).json({ error: "This employer account is suspended." });
      }
    } else if (existingUser.rows.length === 0) {
      const newUser = await db.query(
        `
        INSERT INTO users
        (username, email, password, role, is_approved)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
          name,
          email,
          "google-auth-user",
          "user",
          true
        ]
      );

      user = newUser.rows[0];
    } else {
      user = existingUser.rows[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      role: user.role,
      userId: user.id,
      username: user.username,
      email: user.email,
    });

  } catch (err) {
    console.log("GOOGLE LOGIN ERROR:", err);

    res.status(500).json({
      error: "Google Login Failed",
    });
  }
});

app.get("/api/arbeitnow-jobs", async (req, res) => {
  try {
    const { query = "" } = req.query;

    const response = await axios.get(
      "https://www.arbeitnow.com/api/job-board-api"
    );

    let jobs = response.data.data;

    // Optional search filter
    if (query) {
      jobs = jobs.filter(job =>
        job.title.toLowerCase().includes(query.toLowerCase())
      );
    }

    res.json(jobs);

  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      error: "Failed to fetch Arbeitnow jobs"
    });
  }
});

app.get("/api/candidate/job-alerts", verifyToken, async (req, res) => {
  if (req.user.role !== "user") return res.status(403).json({ error: "Candidate access required" });
  const result = await db.query("SELECT * FROM candidate_job_alert_preferences WHERE candidate_id=$1", [req.user.id]);
  res.json(result.rows[0] || { email_enabled: false, frequency: "daily" });
});
app.put("/api/candidate/job-alerts", verifyToken, async (req, res) => {
  if (req.user.role !== "user") return res.status(403).json({ error: "Candidate access required" });
  const body = req.body || {}; const enabled = body.emailEnabled === true; const frequency = ["instant", "daily", "weekly", "off"].includes(body.frequency) ? body.frequency : "daily";
  await db.query("INSERT INTO candidate_job_alert_preferences (candidate_id,email_enabled,frequency,preferred_locations,preferred_categories,preferred_titles,min_salary,experience,work_modes,job_types,consent_at,consent_source,unsubscribed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $2 THEN NOW() ELSE NULL END,CASE WHEN $2 THEN 'candidate-settings' ELSE NULL END,CASE WHEN $2 THEN NULL ELSE NOW() END) ON CONFLICT (candidate_id) DO UPDATE SET email_enabled=$2,frequency=$3,preferred_locations=$4,preferred_categories=$5,preferred_titles=$6,min_salary=$7,experience=$8,work_modes=$9,job_types=$10,consent_at=CASE WHEN $2 AND candidate_job_alert_preferences.email_enabled=FALSE THEN NOW() ELSE candidate_job_alert_preferences.consent_at END,unsubscribed_at=CASE WHEN $2 THEN NULL ELSE NOW() END,updated_at=NOW()", [req.user.id, enabled, enabled ? frequency : "off", cleanText(body.preferredLocations,500), cleanText(body.preferredCategories,300), cleanText(body.preferredTitles,300), cleanText(body.minSalary,80), cleanText(body.experience,80), cleanText(body.workModes,120), cleanText(body.jobTypes,120)]);
  res.json({ message: "Job alert settings updated" });
});
app.get("/api/job-alerts/unsubscribe", async (req, res) => {
  try { const payload = jwt.verify(String(req.query.token || ""), process.env.JWT_SECRET); if (payload.purpose !== "job-alert-unsubscribe") throw new Error("Invalid token"); await db.query("UPDATE candidate_job_alert_preferences SET email_enabled=FALSE, frequency='off', unsubscribed_at=NOW(), updated_at=NOW() WHERE candidate_id=$1", [payload.candidateId]); res.type("html").send("<main style='font-family:Arial;padding:40px'><h1>Job alerts turned off</h1><p>You will no longer receive MarketLence job-alert emails. You can re-enable them from your account settings anytime.</p></main>"); } catch { res.status(400).type("html").send("<p>This unsubscribe link is invalid or has expired.</p>"); }
});

function cleanNewsText(value = "") {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getRssTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanNewsText(match[1]) : "";
}

app.get("/api/employment-news", async (req, res) => {
  if (employmentNewsCache.expiresAt > Date.now()) {
    return res.json(employmentNewsCache.items);
  }

  try {
    const response = await axios.get("https://news.google.com/rss/search", {
      params: {
        q: "employment jobs career India",
        hl: "en-IN",
        gl: "IN",
        ceid: "IN:en",
      },
      responseType: "text",
      timeout: 8000,
    });

    const items = [...response.data.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .slice(0, 6)
      .map((match) => ({
        title: getRssTag(match[1], "title"),
        link: getRssTag(match[1], "link"),
        publishedAt: getRssTag(match[1], "pubDate"),
      }))
      .filter((item) => item.title && item.link);

    const newsItems = items.length ? items : employmentNewsFallback;
    employmentNewsCache = {
      items: newsItems,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    res.json(newsItems);
  } catch (error) {
    console.error("Could not fetch employment news:", error.message);
    employmentNewsCache = {
      items: employmentNewsFallback,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    res.json(employmentNewsFallback);
  }
});


Promise.all([ensurePushSubscriptionsTable(), ensureJobColumns(), ensureApplicationTrackingTables(), ensureGovernmentJobAgentTables(), ensureCompanyJobAgentTables(), ensureVisaJobAgentTables(), ensureEmployerPostingTables(), ensureJobAlertTables()])
  .then(async () => {
    await deactivateExpiredFeaturedJobs();
    await classifyExistingGovernmentJobs();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      startGovernmentJobAgent();
      startCompanyJobAgent();
      startVisaJobAgent();
      startJobAlertAgent();
      setInterval(() => { void deactivateExpiredFeaturedJobs(); }, 60 * 60 * 1000);
    });
  })
  .catch((error) => {
    console.error("Could not initialize push subscriptions:", error);
    process.exit(1);
  });
