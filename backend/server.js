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

  const sql = "INSERT INTO jobs (title, company, location) VALUES (?, ?, ?)";

  db.query(sql, [title, company, location], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error adding job");
    }

    res.send("Job added ✅");
  });
});
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // simple hardcoded login (for now)
  if (username === "admin" && password === "1234") {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});
app.put("/api/applications/:id", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const sql = "UPDATE applications SET status = ? WHERE id = ?";

  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error updating status");
    }

    res.send("Status updated ✅");
  });
});

app.get("/api/jobs", (req, res) => {
  res.json([
    { id: 1, title: "Frontend Developer", company: "Google", location: "Remote" },
    { id: 2, title: "Data Analyst", company: "Amazon", location: "Bangalore" },
    { id: 3, title: "Finance Analyst", company: "Goldman Sachs", location: "Mumbai" }
  ]);
});app.get("/api/applications", (req, res) => {
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

  const sql = "INSERT INTO applications (name, email, jobId, resume) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, jobId, resume], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error saving application");
    }

    res.send("Application saved with resume ✅");
  });
});
app.delete("/api/applications/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM applications WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error deleting application");
    }

    res.send("Application deleted ✅");
  });
});
app.listen(5000, () => {
  console.log("Server running on port 5000");
});