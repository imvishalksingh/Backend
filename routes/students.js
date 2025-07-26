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
router.get("/", verifyToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === "parent") {
      result = await pool.query("SELECT * FROM students WHERE parent_id = $1", [req.user.id]);
    } else {
      result = await pool.query("SELECT * FROM students");
    }
    res.json(result.rows);
  } catch (err) {
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
