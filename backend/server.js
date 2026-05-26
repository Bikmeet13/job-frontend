require("dotenv").config();

console.log("DB URL:", process.env.DATABASE_URL);

const lastRequest = {};
const otpStore = {};
const pdfParse = require("pdf-parse");

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

cloudinary.config({

  cloud_name: process.env.CLOUD_NAME,

  api_key: process.env.CLOUD_API_KEY,

  api_secret: process.env.CLOUD_API_SECRET

});


const storage = new CloudinaryStorage({

  cloudinary,

  params: async (req, file) => ({

    folder: "marketlence",

     resource_type: isImage ? "image" : "raw",

    type: "upload",

    access_mode: "public"

  })

});

const upload = multer({ storage });

const app = express();
app.use(cors({
  origin: [
  "http://localhost:5173",
  "https://job-frontend-vert.vercel.app",
  "https://jobs.marketlence.com"
],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());   // ✅ REQUIRED
app.get("/api/jobs", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM jobs");

    const jobs = result.rows.map(job => ({
      ...job,
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
    chatbotQuestions
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
        chatbot_questions
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;

    await db.query(sql, [
      title,
      company,
      location,
      salary,
      experience,
      skills,
      description,
      type,
      mode,
      chatbotQuestions ?? []
    ]);

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
  if (req.user.role !== "admin") {
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
  const { user_id, job_id } = req.body;

  console.log("SAVE JOB:", user_id, job_id);

  try {
    await db.query(
      "INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)",
      [user_id, job_id]
    );

    res.send("Job saved ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error saving job");
  }
});
app.get("/api/saved-jobs/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await db.query(
      `
      SELECT jobs.*
      FROM saved_jobs
      JOIN jobs
      ON saved_jobs.job_id = jobs.id
      WHERE saved_jobs.user_id = $1
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

    const { user_id, job_id } = req.body;

    await db.query(

      `
      DELETE FROM saved_jobs
      WHERE user_id = $1
      AND job_id = $2
      `,

      [user_id, job_id]
    );

    res.send("Job removed from saved");

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
    const user = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
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

    if (user.rows[0].role === "admin" && !user.rows[0].is_approved) {
  return res.status(403).json({
    error: "Admin approval pending ⏳"
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
app.delete("/api/jobs/:id", async (req, res) => {
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

    res.json({
      message: "Resume uploaded ✅",
      file: req.file.path
    });

  }
);

app.post(
  "/api/upload-image",
  upload.single("image"),
  (req, res) => {
    res.json({
      message: "Image uploaded ✅",
      file: req.file.path // Cloudinary URL
    });
  }
);


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

app.get("/api/dashboard-stats/:userId", async (req, res) => {

  // ✅ correct way
  const userId = parseInt(req.params.userId);

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

app.delete("/api/applications", async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).send("Unauthorized ❌");
  }

  try {
    await db.query("DELETE FROM applications");
    res.send("All deleted");
  } catch (err) {
    res.status(500).send("Error");
  }
});

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
    const result = await db.query("SELECT * FROM applications");
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching applications");
  }
});




app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});