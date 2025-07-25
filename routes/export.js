const express = require("express");
const { Parser } = require("json2csv");
const pool = require("../db");

const router = express.Router();

/**
 * ✅ Helper Function to Export Any Table to CSV
 */
const exportToCSV = async (res, tableName, fileName, query) => {
  try {
    const { rows } = await pool.query(query || `SELECT * FROM ${tableName}`);
    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(fileName);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ Export Students to CSV
 * URL: /api/export/students
 */
router.get("/students", async (req, res) => {
  await exportToCSV(res, "students", "students_export.csv");
});

/**
 * ✅ Export Attendance to CSV
 * URL: /api/export/attendance
 */
router.get("/attendance", async (req, res) => {
  await exportToCSV(res, "attendance", "attendance_export.csv");
});

/**
 * ✅ Export Fees to CSV
 * URL: /api/export/fees
 */
router.get("/fees", async (req, res) => {
  await exportToCSV(res, "fees", "fees_export.csv");
});

/**
 * ✅ Export Results to CSV
 * URL: /api/export/results
 */
router.get("/results", async (req, res) => {
  // Example: If you have a `results` table with subject-wise grades
  await exportToCSV(res, "results", "results_export.csv");
});

module.exports = router;
