console.log("Loaded from .env:", require("dotenv").config());
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

const app = express();
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());

// Routes
app.use("/api/notifications", notificationRoutes);

// DB Connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`NotificationService running on port ${PORT}`);
});
