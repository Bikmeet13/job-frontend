require("dotenv").config();
const bcrypt = require("bcryptjs");
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
app.use(cors({
  origin: "*",
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
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );

    res.json({
      message: "Signup successful ✅"
    });

  } catch (err) {
  console.error(err);

  res.status(500).json({
    error: "Signup error"
  });
}
}); // ✅ CLOSE SIGNUP ROUTE HERE


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
        email: user.rows[0].email
      },
      "secret123"
    );

    res.json({ token });

  } catch (err) {
    console.log(err);
    res.status(500).send("Login error");
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});