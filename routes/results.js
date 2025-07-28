const express = require("express");
const pool = require("../db");
const router = express.Router();
const PDFDocument = require("pdfkit");

// ✅ Add Multiple Results (One Transaction)
router.post("/add-multiple", async (req, res) => {
  const { student_id, exam, subjects } = req.body;
  if (!student_id || !exam || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO results (student_id, subject, marks, totalmarks, grade, exam)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const insertedResults = [];
    for (const subj of subjects) {
      const { rows } = await client.query(insertQuery, [
        student_id,
        subj.subject,
        subj.marks,
        subj.totalMarks, // ✅ front-end sends totalMarks, backend inserts totalmarks
        subj.grade,
        exam,
      ]);
      insertedResults.push(rows[0]);
    }

    await client.query("COMMIT");
    res.json({ message: "Results added successfully", results: insertedResults });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error adding multiple results:", err);
    res.status(500).json({ error: "Failed to add results" });
  } finally {
    client.release();
  }
});

// ✅ Get Grouped Results for Report Card
router.get("/report/:student_id", async (req, res) => {
  const { student_id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT exam, subject, marks, totalmarks, grade
       FROM results
       WHERE student_id=$1
       ORDER BY exam, subject`,
      [student_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No results found" });
    }

    const grouped = {};
    rows.forEach((r) => {
      if (!grouped[r.exam]) grouped[r.exam] = [];
      grouped[r.exam].push(r);
    });

    res.json({ student_id, exams: grouped });
  } catch (err) {
    console.error("Error fetching report card:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Raw results (optional)
router.get("/:student_id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM results WHERE student_id=$1`,
      [req.params.student_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching student results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Aggregated Results (One Row Per Student Per Exam)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT
        r.student_id,
        s.name AS student_name,
        r.exam,
        SUM(r.marks) AS total_marks_obtained,
        SUM(r.totalmarks) AS total_marks,
        ROUND((SUM(r.marks) * 100.0 / SUM(r.totalmarks)), 2) AS percentage,
        CASE
          WHEN (SUM(r.marks) * 100.0 / SUM(r.totalmarks)) >= 90 THEN 'A+'
          WHEN (SUM(r.marks) * 100.0 / SUM(r.totalmarks)) >= 80 THEN 'A'
          WHEN (SUM(r.marks) * 100.0 / SUM(r.totalmarks)) >= 70 THEN 'B+'
          WHEN (SUM(r.marks) * 100.0 / SUM(r.totalmarks)) >= 60 THEN 'B'
          WHEN (SUM(r.marks) * 100.0 / SUM(r.totalmarks)) >= 50 THEN 'C'
          ELSE 'F'
        END AS grade
      FROM results r
      JOIN students s ON r.student_id = s.id
      GROUP BY r.student_id, s.name, r.exam
      ORDER BY s.name, r.exam;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching aggregated results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/report-pdf/:student_id", async (req, res) => {
  const { student_id } = req.params;

  try {
    // 1️⃣ Fetch student details
    const studentRes = await pool.query(
      "SELECT name, class FROM students WHERE id=$1",
      [student_id]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    const student = studentRes.rows[0];

    // 2️⃣ Fetch results grouped by exam
    const { rows: results } = await pool.query(
      `SELECT exam, subject, marks, totalmarks, grade
       FROM results
       WHERE student_id=$1
       ORDER BY exam, subject`,
      [student_id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: "No results found" });
    }

    // Group by exam
    const groupedExams = {};
    results.forEach((r) => {
      if (!groupedExams[r.exam]) groupedExams[r.exam] = [];
      groupedExams[r.exam].push(r);
    });

    // 3️⃣ Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-card-${student_id}.pdf"`
    );
    doc.pipe(res);

    // Title
    doc.fontSize(20).text("Student Report Card", { align: "center" });
    doc.moveDown();

    // Student Info
    doc.fontSize(14).text(`Name: ${student.name}`);
    doc.text(`Class: ${student.class}`);
    doc.text(`Student ID: ${student_id}`);
    doc.moveDown();

    // Loop Exams
    Object.keys(groupedExams).forEach((exam) => {
      doc.moveDown();
      doc.fontSize(16).text(`${exam}`, { underline: true });

      // Table Heading
      doc.fontSize(12).text("Subject", 50, doc.y + 10);
      doc.text("Marks", 250, doc.y);
      doc.text("Total", 320, doc.y);
      doc.text("Grade", 390, doc.y);
      doc.moveDown();

      let totalMarks = 0;
      let totalObtained = 0;

      groupedExams[exam].forEach((r) => {
        doc.text(r.subject, 50, doc.y);
        doc.text(`${r.marks}`, 250, doc.y);
        doc.text(`${r.totalmarks}`, 320, doc.y);
        doc.text(`${r.grade}`, 390, doc.y);
        doc.moveDown();

        totalMarks += r.totalmarks;
        totalObtained += r.marks;
      });

      // Exam Summary
      const percentage = ((totalObtained / totalMarks) * 100).toFixed(2);
      let finalGrade =
        percentage >= 90
          ? "A+"
          : percentage >= 80
          ? "A"
          : percentage >= 70
          ? "B+"
          : percentage >= 60
          ? "B"
          : percentage >= 50
          ? "C"
          : "F";

      doc.moveDown();
      doc.fontSize(12).text(`Total Marks: ${totalObtained}/${totalMarks}`);
      doc.text(`Percentage: ${percentage}%`);
      doc.text(`Final Grade: ${finalGrade}`);
      doc.moveDown();
    });

    // End PDF
    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
