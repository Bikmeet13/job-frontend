require("dotenv").config();

console.log("DB URL:", process.env.DATABASE_URL);

const pdfParse = require("pdf-parse");

const fs = require("fs");
const axios = require("axios");

const cloudinary = require("cloudinary").v2;

const {
  CloudinaryStorage
} = require("multer-storage-cloudinary");

const nodemailer = require("nodemailer");

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


const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const storage = new CloudinaryStorage({

  cloudinary,

  params: async (req, file) => ({

    folder: "marketlence",

    resource_type: "raw",

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
app.get("/api/jobs", (req, res) => {
  db.query("SELECT * FROM jobs")
    .then(result => res.json(result.rows))
    .catch(err => {
      console.error(err);
      res.status(500).send("Error fetching jobs");
    });
});
app.use("/uploads", express.static("uploads"));
app.post("/api/jobs", async (req, res) => {
  const {
  title,
  company,
  location,
  salary,
  experience,
  skills,
  description,
  type,
  mode
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
  mode
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
  mode
]);


    res.send("Job added ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding job");
  }
});

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) return res.status(403).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/applications", verifyToken, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM applications");
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching applications");
  }
});

app.post("/api/jobs", async (req, res) => {
  const { title, company, location, salary } = req.body;

  try {
    await db.query(
      "INSERT INTO jobs (title, company, location, salary, experience, skills, type, mode) VALUES ($1, $2, $3, $4)",
      [title, company, location, salary]
    );

    res.json({ message: "Job posted successfully ✅" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to post job" });
  }
});

app.post("/api/apply", upload.single("resume"), async (req, res) => {

  try {

    const { name, email, jobId, description, } = req.body;

    const resume = req.file ? req.file.path : null;

    const sql = `
      INSERT INTO applications
      (name, email, jobid, resume)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(sql, [
      name,
      email,
      jobId,
      resume
    ]);
    console.log("Recipient Email:", email);

    // ✅ EMAIL CODE HERE
    try {

      await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: email,

        subject: "Application Submitted Successfully ✅",

        html: `
          <h2>Application Received ✅</h2>

          <p>Hello ${name},</p>

          <p>
          Thank you for applying on Marketlence.
          Your application has been submitted successfully.
          </p>

          <p>
          Our team will review your profile and contact you soon.
          </p>

          <br/>

          <p>
          Best Regards,<br/>
          Marketlence Hiring Team
          </p>
        `
      });

      console.log("Email sent successfully ✅");

    } catch (emailError) {

      console.log("EMAIL ERROR:", emailError);

    }

    res.send("Application saved successfully ✅");

  } catch (err) {

    console.log("APPLY ERROR:", err);

    res.status(500).send("Application failed");

  }

});
app.delete("/api/applications/:id", async (req, res) => {
  const id = req.params.id;

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
app.post("/api/signup", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;

  try {
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email or Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ ADD THIS LOGIC
    let role = "user"; // default

    if (adminSecret === "ADMIN123") {
      role = "admin";
    }

    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)",
      [username, email, hashedPassword, role]
    );

    res.json({
      message: "Signup successful ✅",
      role
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        error: "Username already taken"
      });
    }

    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ error: "Signup error" });
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

    const token = jwt.sign(
  {
    id: user.rows[0].id,
    email: user.rows[0].email,
    role: user.rows[0].role   // ✅ ADD THIS
  },
  "secret123"
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

  console.log("USER ID RECEIVED:", req.params.id);
console.log("TYPE:", typeof req.params.id);

  const userId = parseInt(req.params.id);

  console.log("DASHBOARD USER ID:", userId);
  

  try {

    // ✅ Saved Jobs Count
    const savedJobs = await db.query(
      "SELECT COUNT(*) FROM saved_jobs WHERE user_id = $1",
      [userId]
    );

    // ✅ Applications Count
    const applications = await db.query(
      "SELECT COUNT(*) FROM applications"
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
        jobs.title,
        jobs.company
      FROM applications
      JOIN jobs
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
    await db.query(
      "INSERT INTO chatbot_responses (application_id, question, answer) VALUES ($1, $2, $3)",
      [applicationId, question, answer]
    );
      console.log("API DATA:", res.data);

    res.send("Saved ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.get("/api/chatbot-response/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM chatbot_responses WHERE application_id = $1",
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.get("/api/chatbot-response/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM chatbot_responses WHERE application_id = $1",
      [req.params.id]
    );

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});