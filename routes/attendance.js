const express = require("express");
const pool = require("../db");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Mark Attendance (Admin & Teacher)
//router.post("/mark", verifyToken, async (req, res) => {
//  if (!["admin", "teacher"].includes(req.user.role)) {
//    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
//  }
//  const { student_id, date, status } = req.body;
//  try {
//    const result = await pool.query(
//      `INSERT INTO attendance (student_id, date, status)
//       VALUES ($1, $2, $3)
//       ON CONFLICT (student_id, date)
//       DO UPDATE SET status = EXCLUDED.status
//       RETURNING *`,
//      [student_id, date, status]
//    );
//    res.json(result.rows[0]);
//  } catch (err) {
//    res.status(400).json({ error: err.message });
//  }
//});

const moment = require("moment");

router.post("/mark", verifyToken, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
  }

  const { student_id, date, status } = req.body;

  try {
    const formattedDate = moment(date).format("YYYY-MM-DD");
    const today = moment().format("YYYY-MM-DD");

    if (formattedDate !== today) {
      return res.status(400).json({ error: "You can only mark attendance for today" });
    }

    const result = await pool.query(
      `INSERT INTO attendance (student_id, date, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING *`,
      [student_id, formattedDate, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Attendance marking failed:", err);
    res.status(400).json({ error: err.message });
  }
});


router.post("/bulk-mark", verifyToken, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
  }

  const today = moment().format("YYYY-MM-DD");

  const { attendance } = req.body; // array of {student_id, status}

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const entry of attendance) {
      const { student_id, status } = entry;

      await client.query(
        `INSERT INTO attendance (student_id, date, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status`,
        [student_id, today, status]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
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
