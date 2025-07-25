const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Add Student (manual roll_no)
router.post("/add", async (req, res) => {
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

// ✅ Update Student
router.put("/:id", async (req, res) => {
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


// ✅ Get All Students (Admin & Teachers)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students");
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ✅ Check unpaid fees
    const feeCheck = await client.query(
      "SELECT COUNT(*) AS unpaid_count FROM fees WHERE student_id = $1 AND paid = false",
      [req.params.id]
    );

    if (parseInt(feeCheck.rows[0].unpaid_count) > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Please clear all pending fees before deleting this student." });
    }

    // ✅ Delete all paid fee records (to satisfy foreign key)
    await client.query("DELETE FROM fees WHERE student_id = $1", [req.params.id]);

    // ✅ Delete attendance records
    await client.query("DELETE FROM attendance WHERE student_id = $1", [req.params.id]);

    // ✅ Delete student
    await client.query("DELETE FROM students WHERE id = $1", [req.params.id]);

    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting student:", err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});



module.exports = router;
