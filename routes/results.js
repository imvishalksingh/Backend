const express = require("express");
const pool = require("../db");
const router = express.Router();
const PDFDocument = require("pdfkit");
const fs = require("fs");

// ✅ Add Exam Result (Admin/Teacher)
router.post("/add", async (req, res) => {
  const { student_id, subject, marks, total_marks, exam_name, exam_date } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO results (student_id, subject, marks, total_marks, exam_name, exam_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [student_id, subject, marks, total_marks, exam_name, exam_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View Results of a Student (Parent/Teacher)
router.get("/:student_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM results WHERE student_id=$1",
      [req.params.student_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Download Report Card as PDF
router.get("/report/:student_id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM results WHERE student_id=$1",
      [req.params.student_id]
    );

    const doc = new PDFDocument();
    const fileName = `report_card_${req.params.student_id}.pdf`;
    doc.pipe(fs.createWriteStream(fileName));

    doc.fontSize(20).text("Report Card", { align: "center" }).moveDown();
    rows.forEach((r) => {
      doc
        .fontSize(12)
        .text(`Subject: ${r.subject}, Marks: ${r.marks}/${r.total_marks}, Exam: ${r.exam_name}`);
    });

    doc.end();

    doc.on("finish", () => {
      res.download(fileName, () => fs.unlinkSync(fileName));
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
