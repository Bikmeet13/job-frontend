const jwt = require("jsonwebtoken");
const db = require("./db");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

const app = express();
app.use(cors());
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
  const { title, company, location } = req.body;

  try {
    const sql = "INSERT INTO jobs (title, company, location) VALUES ($1, $2, $3)";
    await db.query(sql, [title, company, location]);

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

app.post("/api/apply", upload.single("resume"), async (req, res) => {
  const { name, email, jobId } = req.body;
  const resume = req.file ? req.file.filename : null;
   
  try {
    const sql = "INSERT INTO applications (name, email, jobId, resume) VALUES ($1, $2, $3, $4)";
    await db.query(sql, [name, email, jobId, resume]);

    res.send("Application saved with resume ✅");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error saving application");
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
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    const token = jwt.sign({ username }, "secret123");
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});