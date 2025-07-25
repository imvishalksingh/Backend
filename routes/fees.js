const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Get All Fees (For Dashboard/Admin)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM fees");
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ Admin Adds Fee Record
router.post("/add", async (req, res) => {
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

// ✅ Parent Views Paid & Pending Fees
router.get("/:student_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fees WHERE student_id=$1",
      [req.params.student_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Mark Fee as Paid (Admin updates when parent pays manually)
router.put("/pay/:id", async (req, res) => {
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
