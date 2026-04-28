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
  .catch(err => console.log(err));
});
app.use("/uploads", express.static("uploads"));
app.post("/api/jobs", (req, res) => {
  const { title, company, location } = req.body;

  const sql = "INSERT INTO jobs (title, company, location) VALUES ($1, $2, $3, $4)";

  db.query(sql, [title, company, location], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error adding job");
    }

    res.send("Job added ✅");
  });
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

app.get("/api/applications", verifyToken, (req, res) => {
  db.query("SELECT * FROM applications", (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error fetching applications");
    }

    res.json(result);
  });
});

app.post("/api/apply", upload.single("resume"), (req, res) => {
  const { name, email, jobId } = req.body;
  const resume = req.file.filename;

  const sql = "INSERT INTO jobs (title, company, location) VALUES ($1, $2, $3)";
  db.query(sql, [name, email, jobId, resume], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error saving application");
    }

    res.send("Application saved with resume ✅");
  });
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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});