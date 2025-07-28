const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../midleware/verifyToken");
const adminOnly = require("../midleware/adminOnly");

// ✅ NEW: Cloudinary Config + Multer
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "aastha-users",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});
const upload = multer({ storage });

// ✅ GET all users or filter by role (e.g., teacher)
router.get("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    let query = "SELECT id, name, email, role, photo FROM users";
    let values = [];

    if (role) {
      query += " WHERE role = $1";
      values.push(role);
    }

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Upload/Update Photo (Admin can update any user)
router.put("/update-photo/:id", verifyToken, adminOnly, upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

    const photoUrl = req.file.path;
    await pool.query("UPDATE users SET photo=$1 WHERE id=$2", [photoUrl, id]);

    res.json({ message: "Photo updated successfully", photo: photoUrl });
  } catch (error) {
    console.error("Error updating photo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ DELETE teacher only (admin can delete)
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    if (rows[0].role !== "teacher") {
      return res.status(400).json({ error: "Only teachers can be deleted here" });
    }

    // ✅ Check if any unpaid salaries exist
    const { rows: salaryRows } = await pool.query(
      "SELECT paid FROM salaries WHERE teacher_id = $1",
      [id]
    );

    const hasPending = salaryRows.some((s) => s.paid === false);
    if (hasPending) {
      return res
        .status(400)
        .json({ error: "Cannot delete teacher. Some salary records are still pending." });
    }

    // ✅ Delete teacher (thanks to ON DELETE SET NULL in salaries table)
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public-teachers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, photo FROM users WHERE role = 'teacher'`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
