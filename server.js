const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");
const feesRoutes = require("./routes/fees");
const announcementRoutes = require("./routes/announcements");
const resultRoutes = require("./routes/results");
const notificationRoutes = require("./routes/notifications");
const salaryRoutes = require("./routes/salaries");
const exportRoutes = require("./routes/export");
const userRoutes = require("./routes/userRoutes");
require("dotenv").config();
const pool = require("./db");


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/export", exportRoutes);


app.get("/", (req, res) => {
  res.send("School App Backend Running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

