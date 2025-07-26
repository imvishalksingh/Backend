const express = require("express");
const pool = require("../db");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Get Fees
router.get("/", verifyToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === "parent") {
      result = await pool.query(
        `SELECT f.* FROM fees f
         JOIN students s ON f.student_id = s.id
         WHERE s.parent_id=$1`,
        [req.user.id]
      );
    } else {
      result = await pool.query("SELECT * FROM fees");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Add Fee (Admin only)
router.post("/add", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can add fees" });
  }
  const { student_id, amount, due_date } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO fees (student_id, amount, due_date) VALUES ($1, $2, $3) RETURNING *",
      [student_id, amount, due_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Pay Fee (Admin only updates)
router.put("/pay/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can update fee status" });
  }
  try {
    const result = await pool.query(
      "UPDATE fees SET paid=true, paid_date=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
