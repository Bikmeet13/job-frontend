require("dotenv").config();

console.log("DB URL:", process.env.DATABASE_URL);

const lastRequest = {};
const otpStore = {};
let employmentNewsCache = { items: [], expiresAt: 0 };
let companyJobScanRunning = false;
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

const fs = require("fs");
const axios = require("axios");

const cloudinary = require("cloudinary").v2;

const {
  CloudinaryStorage
} = require("multer-storage-cloudinary");

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const db = require("./db");
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

const app = express();
app.use(cors({
  origin: [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "https://job-frontend-vert.vercel.app",
  "https://jobs.marketlence.com"
],
  methods: ["GET", "POST", "PUT", "DELETE"],
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
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_date TEXT"),
    db.query("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
    db.query("ALTER TABLE jobs ALTER COLUMN title TYPE VARCHAR(300)"),
  ]);
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
  await db.query("ALTER TABLE company_job_drafts ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN NOT NULL DEFAULT FALSE");
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

async function scanGovernmentJobSources() {
  const { rows: sources } = await db.query(
    "SELECT id, name, url FROM government_job_sources WHERE enabled = TRUE"
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
          `INSERT INTO government_job_drafts (source_id, source_name, source_url, title, apply_link)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (apply_link) DO NOTHING
           RETURNING id`,
          [source.id, source.name, source.url, listing.title, listing.applyLink]
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

async function scanCompanyJobSources() {
  if (companyJobScanRunning) return { running: true, sourcesChecked: 0, discovered: 0, unavailable: 0 };

  companyJobScanRunning = true;

  try {
    const { rows: sources } = await db.query(
      "SELECT id, name, url, job_category FROM company_job_sources WHERE enabled = TRUE"
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

          for (const listing of listings) {
            const inserted = await db.query(
            `INSERT INTO company_job_drafts (source_id, source_name, source_url, job_category, title, apply_link, visa_sponsorship)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (apply_link) DO NOTHING
               RETURNING id`,
              [source.id, source.name, source.url, source.job_category, listing.title, listing.applyLink, hasVisaSponsorship(`${listing.title} ${listing.applyLink} ${listing.context}`)]
            );
            if (inserted.rows.length) found += 1;
          }
          return { found, unavailable: false };
        } catch (error) {
          // A careers website may block automated access, move its page, or
          // have a certificate problem. Skip it and continue with all others.
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
    const result = await db.query("SELECT * FROM jobs");

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
        last_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
      lastDate?.trim() || null
    ]);

    void sendNewJobNotification({
      id: result.rows[0].id,
      title,
      company,
      location,
    });
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
  const { name, url } = req.body;
  if (!name?.trim() || !isOfficialIndianGovernmentUrl(url)) {
    return res.status(400).json({ error: "Use a named official Indian government URL ending in .gov.in or .nic.in" });
  }

  try {
    const result = await db.query(
      "INSERT INTO government_job_sources (name, url) VALUES ($1, $2) RETURNING *",
      [name.trim(), url.trim()]
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
       (title, company, location, salary, experience, skills, description, type, mode, chatbot_questions, apply_enabled, apply_link, job_category, last_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        draft.title.slice(0, 300),
        draft.source_name,
        "India",
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
        "Check official notification",
      ]
    );

    await db.query(
      "UPDATE government_job_drafts SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [draft.id]
    );
    void sendNewJobNotification({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: "India" });
    void postApprovedJobToFacebook({
      id: jobResult.rows[0].id,
      title: draft.title,
      company: draft.source_name,
      location: "India",
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
  const { name, url, jobCategory = "Private" } = req.body;
  if (!name?.trim() || !isSafeCompanySourceUrl(url)) {
    return res.status(400).json({ error: "Use a verified HTTPS company careers URL" });
  }
  const category = jobCategory === "Government" ? "Government" : "Private";

  try {
    const result = await db.query(
      "INSERT INTO company_job_sources (name, url, job_category) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), url.trim(), category]
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
       (title, company, location, salary, experience, skills, description, type, mode, chatbot_questions, apply_enabled, apply_link, job_category, last_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        draft.visa_sponsorship ? "Visa Sponsorship" : "As per company posting",
        [],
        false,
        draft.apply_link,
        draft.job_category === "Government" ? "Government" : "Private",
        "Check company careers page",
      ]
    );
    await db.query(
      "UPDATE company_job_drafts SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [draft.id]
    );
    void sendNewJobNotification({ id: jobResult.rows[0].id, title: draft.title, company: draft.source_name, location: "See company careers page" });
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


app.post("/api/apply", upload.single("resume"), async (req, res) => {

  try {

     console.log("jobId type:", typeof req.body.jobId);
    console.log("jobId value:", req.body.jobId);

    const name = req.body.name;
const email = req.body.email;
const jobId = parseInt(req.body.jobId);

if (!jobId) {
  return res.status(400).json({ error: "Job ID missing ❌" });
}
 // 🔥 FIX

    const resume = req.file ? req.file.path : null;

   // ✅ INSERT + RETURN ID
    const result = await db.query(
      `INSERT INTO applications (name, email, jobid, resume)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, email, jobId, resume]
    );

   const applicationId = result.rows[0].id;

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
        <p>Your application has been submitted successfully.</p>
        <p>We will contact you soon.</p>
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
    const sql = "DELETE FROM applications WHERE id = $1";
    await db.query(sql, [id]);

    res.send("Application deleted ✅");
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

app.put("/api/applications/:id", async (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  try {
    await db.query(
      "UPDATE applications SET status=$1 WHERE id=$2",
      [status, id]
    );

    res.send("Status updated ✅");
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


app.get("/api/recent-applications", async (req, res) => {

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


app.get("/api/applications/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await db.query(
      "SELECT * FROM applications WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching application");
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await db.query(
      "SELECT * FROM jobs WHERE id = $1",
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
  const { username, email, password, otp, isAdmin } = req.body;

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

    await db.query(
      "INSERT INTO users (username, email, password, role, is_approved) VALUES ($1,$2,$3,$4,$5)",
      [username, cleanEmail, hashedPassword, role, isApproved]
    );

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
        COALESCE(jobs.company, 'Unknown Company') AS company
      FROM applications
      LEFT JOIN jobs
      ON applications.jobid = jobs.id
      WHERE applications.email = $1
      ORDER BY applications.id DESC
      `,
      [req.user.email]
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
    const { credential } = req.body;

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

    if (existingUser.rows.length === 0) {
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


Promise.all([ensurePushSubscriptionsTable(), ensureJobColumns(), ensureGovernmentJobAgentTables(), ensureCompanyJobAgentTables()])
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      startGovernmentJobAgent();
      startCompanyJobAgent();
    });
  })
  .catch((error) => {
    console.error("Could not initialize push subscriptions:", error);
    process.exit(1);
  });
