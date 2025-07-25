const express = require("express");
const pool = require("../db");
const router = express.Router();

router.post("/mark", async (req, res) => {
  const { student_id, date, status } = req.body;
  try {
    // Check if already marked
    const check = await pool.query(
      "SELECT * FROM attendance WHERE student_id = $1 AND date = $2",
      [student_id, date]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: "Attendance already marked" });
    }

    const result = await pool.query(
      "INSERT INTO attendance (student_id, date, status) VALUES ($1, $2, $3) RETURNING *",
      [student_id, date, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ View Attendance of a Student (Filter by Date if provided)
// ✅ View Attendance of a Student (with optional date filter)
router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    const { date } = req.query;

    let query = "SELECT * FROM attendance WHERE student_id=$1";
    let params = [student_id];

    if (date) {
      query += " AND date=$2";
      params.push(date);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ Get attendance for all students on a specific date
router.get("/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      "SELECT * FROM attendance WHERE date = $1",
      [date]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get all attendance records for a selected date
router.get("/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      "SELECT * FROM attendance WHERE date = $1",
      [date]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
