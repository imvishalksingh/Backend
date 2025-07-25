const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Admin Posts Announcement
router.post("/add", async (req, res) => {
  const { title, message } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING *",
      [title, message]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Everyone Views Announcements
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
