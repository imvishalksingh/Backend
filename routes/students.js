const express = require("express");
const pool = require("../db");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");

// ✅ Add Student (Admin only)
router.post("/add", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can add students" });
  }
  const { name, className, parent_id, roll_no } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO students (name, class, parent_id, roll_no) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, className, parent_id, roll_no]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update Student (Admin + Teacher)
router.put("/:id", verifyToken, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teacher can update" });
  }
  const { name, className, parent_id, roll_no } = req.body;
  try {
    const result = await pool.query(
      "UPDATE students SET name=$1, class=$2, parent_id=$3, roll_no=$4 WHERE id=$5 RETURNING *",
      [name, className, parent_id, roll_no, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Students (Parents see only their own child)
//router.get("/", verifyToken, async (req, res) => {
//  try {
//    let result;
//    if (req.user.role === "parent") {
//      result = await pool.query("SELECT * FROM students WHERE parent_id = $1", [req.user.id]);
//    } else {
//      result = await pool.query("SELECT * FROM students");
//    }
//    res.json(result.rows);
//  } catch (err) {
//    res.status(400).json({ error: err.message });
//  }
//});


// ✅ GET Students - Parent / Teacher / Admin
// ✅ Get students for parent with fee & attendance details
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "parent") {
      const query = `
        SELECT
          s.id,
          s.name,
          s.class,
          s.roll_no,
          s.parent_id,

          -- ✅ Attendance Percentage
          COALESCE((
            SELECT ROUND(
              (COUNT(*) FILTER (WHERE a.status = 'Present')::decimal / NULLIF(COUNT(*), 0) * 100),
              1
            )
            FROM attendance a
            WHERE a.student_id = s.id
          ), 0) AS attendance_percentage,

          -- ✅ Fee Status
          CASE
            WHEN EXISTS (
              SELECT 1 FROM fees f WHERE f.student_id = s.id AND f.paid = false
            ) THEN 'Pending'
            ELSE 'Paid'
          END AS fee_status,

          -- ✅ Pending Fee Amount
          COALESCE((
            SELECT SUM(f.amount)
            FROM fees f
            WHERE f.student_id = s.id AND f.paid = false
          ), 0) AS pending_fee_amount

        FROM students s
        WHERE s.parent_id = $1;
      `;

      const result = await pool.query(query, [req.user.id]);
      return res.json(result.rows);
    }

    if (req.user.role === "teacher" || req.user.role === "admin") {
      const result = await pool.query("SELECT * FROM students");
      return res.json(result.rows);
    }

    res.status(403).json({ error: "Access denied" });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(400).json({ error: err.message });
  }
});



// ✅ Delete Student (Admin only & after clearing fees)
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can delete students" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const feeCheck = await client.query(
      "SELECT COUNT(*) AS unpaid_count FROM fees WHERE student_id = $1 AND paid = false",
      [req.params.id]
    );

    if (parseInt(feeCheck.rows[0].unpaid_count) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Clear pending fees before deleting student" });
    }

    await client.query("DELETE FROM fees WHERE student_id = $1", [req.params.id]);
    await client.query("DELETE FROM attendance WHERE student_id = $1", [req.params.id]);
    await client.query("DELETE FROM students WHERE id = $1", [req.params.id]);

    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
