const express = require("express");
const pool = require("../db");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Mark Attendance (Admin & Teacher)
router.post("/mark", verifyToken, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
  }
  const { student_id, date, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO attendance (student_id, date, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING *`,
      [student_id, date, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Attendance of a Student
router.get("/:student_id", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "parent") {
      const student = await pool.query("SELECT * FROM students WHERE id=$1 AND parent_id=$2", [
        req.params.student_id,
        req.user.id,
      ]);
      if (student.rowCount === 0) {
        return res.status(403).json({ error: "Not authorized to view this student's attendance" });
      }
    }
    const result = await pool.query("SELECT * FROM attendance WHERE student_id=$1", [
      req.params.student_id,
    ]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Attendance by Date (Admin & Teacher, Parents can view only their child)
router.get("/date/:date", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "parent") {
      const result = await pool.query(
        `SELECT a.* FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.date=$1 AND s.parent_id=$2`,
        [req.params.date, req.user.id]
      );
      return res.json(result.rows);
    }
    const result = await pool.query("SELECT * FROM attendance WHERE date=$1", [req.params.date]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
