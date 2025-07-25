const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Admin Sends Notification (to all or specific user)
router.post("/add", async (req, res) => {
  const { title, message, user_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notifications (title, message, user_id) VALUES ($1,$2,$3) RETURNING *",
      [title, message, user_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Notifications for a User
router.get("/:user_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC",
      [req.params.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
