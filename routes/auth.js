const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const upload = require("../midleware/upload");
require("dotenv").config();

const router = express.Router();

// REGISTER
router.post("/register", upload.single("photo"), async (req, res) => {
 console.log("📌 Register API hit!", req.body, req.file);
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const { rows: existing } = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ If photo uploaded, save its Cloudinary URL
    const photoUrl = req.file ? req.file.path : null;

    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password, role, photo) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, photo",
      [name, email, hashedPassword, role, photoUrl]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
