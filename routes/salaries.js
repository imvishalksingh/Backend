const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Admin Adds Salary Record
router.post("/add", async (req, res) => {
  const { teacher_id, month, amount } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO salaries (teacher_id, month, amount) VALUES ($1, $2, $3) RETURNING *",
      [teacher_id, month, amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Mark Salary as Paid
router.put("/pay/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE salaries SET paid=true, paid_date=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View Salaries of a Teacher
router.get("/:teacher_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM salaries WHERE teacher_id=$1",
      [req.params.teacher_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
